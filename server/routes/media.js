/**
 * Media and attachment routes
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const heicConvert = require('heic-convert');
const { getDatabase } = require('../db/connection');
const { getDisplayName, getContactGroupMap } = require('../db/contacts');
const { convertMacTime } = require('../helpers/time');
const { getAttachmentType, expandPath } = require('../helpers/attachments');
const { mediaProcessor } = require('../processors/media');
const { THUMB_DIR, HEIC_DIR } = require('../config');

const router = express.Router();

/**
 * Async file existence check
 */
async function fileExists(filePath) {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /thumb/:id - Get thumbnail for attachment
 */
router.get('/thumb/:id', async (req, res) => {
  const db = getDatabase();
  const attachmentId = req.params.id;
  const thumbPath = path.join(THUMB_DIR, `${attachmentId}.jpg`);
  
  if (await fileExists(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(thumbPath);
  }
  
  // Fetch attachment info and process on-demand
  const row = await new Promise(resolve => {
    db.get(`SELECT filename, mime_type FROM attachment WHERE ROWID = ?`, [attachmentId], (err, row) => {
      resolve(err ? null : row);
    });
  });
  
  if (!row || !row.filename) {
    return res.status(404).send('Not found');
  }
  
  await mediaProcessor.processAttachment({ id: attachmentId, ...row });
  
  if (await fileExists(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(thumbPath);
  } else {
    res.redirect(`/attachment/${attachmentId}`);
  }
});

/**
 * GET /attachment/:id - Serve attachment file
 */
router.get('/attachment/:id', async (req, res) => {
  const db = getDatabase();
  const attachmentId = req.params.id;
  
  const row = await new Promise(resolve => {
    db.get(`SELECT filename, mime_type, transfer_name FROM attachment WHERE ROWID = ?`, [attachmentId], (err, row) => {
      resolve(err ? null : row);
    });
  });
  
  if (!row || !row.filename) {
    return res.status(404).send('Attachment not found');
  }
  
  const filePath = expandPath(row.filename);
  if (!filePath || !(await fileExists(filePath))) {
    return res.status(404).send('Attachment file not found');
  }
  
  const isHeic = /\.(heic|heif)$/i.test(filePath) || 
                 row.mime_type === 'image/heic' || 
                 row.mime_type === 'image/heif';
  
  if (isHeic) {
    try {
      const cacheFile = path.join(HEIC_DIR, `${attachmentId}.jpg`);
      
      if (await fileExists(cacheFile)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.sendFile(cacheFile);
      }
      
      const inputBuffer = await fsPromises.readFile(filePath);
      const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9
      });
      
      await fsPromises.writeFile(cacheFile, outputBuffer);
      
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(outputBuffer);
    } catch (convErr) {
      // HEIC conversion failed, fall back to original file
      if (row.mime_type) res.setHeader('Content-Type', row.mime_type);
      res.sendFile(filePath);
    }
  } else {
    if (row.mime_type) res.setHeader('Content-Type', row.mime_type);
    res.sendFile(filePath);
  }
});

/**
 * GET /global/media - Get all media across conversations
 */
router.get('/global/media', async (req, res) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';
  const contactIds = req.query.contacts ? req.query.contacts.split(',') : [];
  const contactGroupMap = getContactGroupMap();
  
  let contactFilter = '';
  const params = [];
  
  if (contactIds.length > 0) {
    const allIdentifiers = new Set();
    contactIds.forEach(contactId => {
      if (contactGroupMap.has(contactId)) {
        contactGroupMap.get(contactId).identifiers.forEach(id => allIdentifiers.add(id));
      }
    });
    
    if (allIdentifiers.size > 0) {
      contactFilter = ` AND h.id IN (${[...allIdentifiers].map(() => '?').join(',')})`;
      params.push(...allIdentifiers);
    }
  }
  
  params.push(limit, offset);
  
  const rows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        a.ROWID as attachment_id,
        a.filename,
        a.mime_type,
        a.transfer_name,
        a.total_bytes,
        m.ROWID as message_id,
        m.date,
        m.is_from_me,
        cmj.chat_id,
        h.id as contact_identifier
      FROM attachment a
      JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
      JOIN message m ON maj.message_id = m.ROWID
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      JOIN chat_handle_join chj ON cmj.chat_id = chj.chat_id
      JOIN handle h ON chj.handle_id = h.ROWID
      WHERE (a.mime_type LIKE 'image/%' OR a.mime_type LIKE 'video/%'
             OR a.filename LIKE '%.jpg' OR a.filename LIKE '%.jpeg' 
             OR a.filename LIKE '%.png' OR a.filename LIKE '%.heic'
             OR a.filename LIKE '%.mov' OR a.filename LIKE '%.mp4')
        AND a.filename NOT LIKE '%pluginPayloadAttachment%'
        ${contactFilter}
      GROUP BY a.ROWID
      ORDER BY m.date ${sort}
      LIMIT ? OFFSET ?
    `, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  // Process media with async file checks
  const media = [];
  for (const row of rows) {
    const type = getAttachmentType(row.mime_type, row.filename);
    const expandedPath = expandPath(row.filename);
    const exists = expandedPath ? await fileExists(expandedPath) : false;
    
    if (exists && (type === 'image' || type === 'video')) {
      media.push({
        id: row.attachment_id,
        filename: row.transfer_name || path.basename(row.filename || ''),
        type,
        url: `/attachment/${row.attachment_id}`,
        thumbUrl: `/thumb/${row.attachment_id}`,
        date: convertMacTime(row.date),
        contact: getDisplayName(row.contact_identifier),
        is_from_me: row.is_from_me,
        chat_id: row.chat_id,
        message_id: row.message_id
      });
    }
  }
  
  res.json({ media, hasMore: rows.length === limit });
});

module.exports = router;
