/**
 * Conversation routes
 * @module routes/conversations
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { dbAll, dbGet } = require('../db/connection');
const { getDisplayName, getGroupMemberNames, getContactId } = require('../db/contacts');
const { getMessageText, extractUrls } = require('../helpers/text');
const { convertMacTime } = require('../helpers/time');
const { getAttachmentType, expandPath } = require('../helpers/attachments');
const { normalizePhone, normalizeEmail } = require('../helpers/phone');
const { cleanText } = require('../helpers/unicode');
const { DEFAULT_CONVERSATION_PAGE_SIZE } = require('../config');
const logger = require('../helpers/logger');

const router = express.Router();

// ============================================================
// Configuration
// ============================================================

// Use centralized config for page size
const DEFAULT_PAGE_SIZE = DEFAULT_CONVERSATION_PAGE_SIZE;

// ============================================================
// Pure functions for data transformation
// ============================================================

/**
 * Async file existence check
 */
const fileExists = (filePath) =>
  new Promise(resolve => {
    fs.access(filePath, fs.constants.F_OK, err => resolve(!err));
  });

/**
 * Batch check file existence (parallel)
 */
const batchFileExists = async (paths) => {
  const results = await Promise.all(
    paths.map(p => p ? fileExists(p) : Promise.resolve(false))
  );
  return results;
};

/**
 * Format attachment preview text (e.g., "Attachment: 1 Photo")
 */
const formatAttachmentPreview = (attachments) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }
  
  const counts = { image: 0, video: 0, audio: 0, other: 0 };
  attachments.forEach(att => {
    const type = getAttachmentType(att.mime_type, att.filename);
    counts[type] = (counts[type] || 0) + 1;
  });
  
  const parts = [];
  if (counts.image > 0) parts.push(`${counts.image} Photo${counts.image > 1 ? 's' : ''}`);
  if (counts.video > 0) parts.push(`${counts.video} Video${counts.video > 1 ? 's' : ''}`);
  if (counts.audio > 0) parts.push(`${counts.audio} Audio`);
  if (counts.other > 0) parts.push(`${counts.other} File${counts.other > 1 ? 's' : ''}`);
  
  return parts.length > 0 ? `Attachment: ${parts.join(', ')}` : null;
};

/**
 * Get last message preview for a conversation
 */
const getLastMessagePreview = async (messageId, text, attributedBody) => {
  let lastMessage = text;
  if (!lastMessage || !cleanText(lastMessage)) {
    lastMessage = getMessageText({ text, attributedBody });
  }
  
  const cleanedMessage = cleanText(lastMessage);
  if (cleanedMessage) return cleanedMessage;
  
  if (messageId) {
    const attachments = await dbAll(`
      SELECT a.mime_type, a.filename
      FROM message_attachment_join maj
      JOIN attachment a ON maj.attachment_id = a.ROWID
      WHERE maj.message_id = ?
    `, [messageId]);
    
    const preview = formatAttachmentPreview(attachments);
    if (preview) return preview;
  }
  
  return '[Media]';
};

/**
 * Process individual chat row
 */
const processIndividualChat = (row, lastMessage, individualChats) => {
  const contactId = getContactId(row.identifier);
  const normalizedId = row.identifier.includes('@') 
    ? normalizeEmail(row.identifier)
    : normalizePhone(row.identifier);
  
  const displayName = getDisplayName(row.identifier);
  const key = contactId || normalizedId || `unknown-${row.identifier}`;
  
  if (!individualChats.has(key)) {
    individualChats.set(key, {
      contact_id: contactId || key,
      display_name: displayName,
      identifier: row.identifier,
      chat_ids: [],
      message_count: 0,
      last_message_date: row.last_message_date,
      last_message: lastMessage,
      is_group: false
    });
  }
  
  const group = individualChats.get(key);
  if (!group.chat_ids.includes(row.chat_id)) {
    group.chat_ids.push(row.chat_id);
  }
  group.message_count += row.message_count;
  
  if (displayName && displayName !== row.identifier && group.display_name === group.identifier) {
    group.display_name = displayName;
  }
  
  if (row.last_message_date > group.last_message_date) {
    group.last_message_date = row.last_message_date;
    group.last_message = lastMessage;
  }
};

/**
 * Process group chat row
 */
const processGroupChat = (row, lastMessage) => {
  const memberNames = getGroupMemberNames(row.all_participants);
  const displayName = row.chat_display_name || 
    (memberNames.length > 0 ? memberNames.join(', ') : 'Group Chat');
  
  return {
    contact_id: `group-${row.chat_id}`,
    display_name: displayName,
    identifier: row.all_participants,
    member_names: memberNames,
    chat_ids: [row.chat_id],
    message_count: row.message_count,
    last_message_date: row.last_message_date,
    last_message: lastMessage,
    is_group: true
  };
};

/**
 * Process attachments with parallel file existence checks
 */
const processAttachments = async (attachments) => {
  const paths = attachments.map(att => expandPath(att.filename));
  const existsResults = await batchFileExists(paths);
  
  const attachmentMap = new Map();
  
  attachments.forEach((att, idx) => {
    if (!attachmentMap.has(att.message_id)) {
      attachmentMap.set(att.message_id, []);
    }
    
    const type = getAttachmentType(att.mime_type, att.filename);
    const exists = existsResults[idx];
    
    attachmentMap.get(att.message_id).push({
      id: att.attachment_id,
      filename: att.transfer_name || path.basename(att.filename || ''),
      mime_type: att.mime_type,
      size: att.total_bytes,
      type,
      url: exists ? `/attachment/${att.attachment_id}` : null,
      thumbUrl: (exists && (type === 'image' || type === 'video')) ? `/thumb/${att.attachment_id}` : null
    });
  });
  
  return attachmentMap;
};

/**
 * Parse chat IDs from request param
 */
const parseChatIds = (idParam) => 
  idParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

/**
 * Get conversation stats (total messages, media count, link count)
 */
const getConversationStats = async (chatIds) => {
  const placeholders = chatIds.map(() => '?').join(',');
  
  const [totalRow, mediaRow, linksRow] = await Promise.all([
    dbGet(`
      SELECT COUNT(*) as total
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id IN (${placeholders})
    `, chatIds),
    dbGet(`
      SELECT COUNT(DISTINCT a.ROWID) as count
      FROM attachment a
      JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
      JOIN message m ON maj.message_id = m.ROWID
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id IN (${placeholders})
        AND (a.mime_type LIKE 'image/%' OR a.mime_type LIKE 'video/%'
             OR a.filename LIKE '%.jpg' OR a.filename LIKE '%.jpeg' 
             OR a.filename LIKE '%.png' OR a.filename LIKE '%.heic'
             OR a.filename LIKE '%.mov' OR a.filename LIKE '%.mp4')
        AND a.filename NOT LIKE '%pluginPayloadAttachment%'
    `, chatIds),
    dbGet(`
      SELECT COUNT(*) as count
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id IN (${placeholders})
        AND m.text LIKE '%http%'
    `, chatIds)
  ]);
  
  return {
    totalMessages: totalRow?.total || 0,
    mediaCount: mediaRow?.count || 0,
    linkCount: linksRow?.count || 0
  };
};

// ============================================================
// Route handlers
// ============================================================

/**
 * GET /conversations - Get all conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const rows = await dbAll(`
      WITH chat_stats AS (
        SELECT 
          cmj.chat_id,
          COUNT(*) as message_count,
          MAX(m.date) as last_message_date
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        GROUP BY cmj.chat_id
      ),
      last_messages AS (
        SELECT 
          cmj.chat_id,
          m.ROWID as message_id,
          m.text,
          m.attributedBody,
          ROW_NUMBER() OVER (PARTITION BY cmj.chat_id ORDER BY m.date DESC) as rn
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      ),
      chat_participants AS (
        SELECT 
          chj.chat_id,
          COUNT(DISTINCT chj.handle_id) as participant_count,
          GROUP_CONCAT(DISTINCT h.id) as all_participants,
          MIN(h.id) as primary_identifier
        FROM chat_handle_join chj
        JOIN handle h ON chj.handle_id = h.ROWID
        GROUP BY chj.chat_id
      )
      SELECT 
        c.ROWID as chat_id,
        c.display_name as chat_display_name,
        c.chat_identifier,
        cp.all_participants,
        cp.participant_count,
        cp.primary_identifier as identifier,
        cs.last_message_date,
        cs.message_count,
        lm.message_id as last_message_id,
        lm.text as last_message_text,
        lm.attributedBody as last_message_body
      FROM chat c
      JOIN chat_participants cp ON c.ROWID = cp.chat_id
      JOIN chat_stats cs ON c.ROWID = cs.chat_id
      LEFT JOIN last_messages lm ON c.ROWID = lm.chat_id AND lm.rn = 1
      WHERE cs.last_message_date IS NOT NULL
      ORDER BY cs.last_message_date DESC
    `);
    
    const individualChats = new Map();
    const groupChats = [];
    
    for (const row of rows) {
      const isGroupChat = row.participant_count > 1;
      const lastMessage = await getLastMessagePreview(
        row.last_message_id,
        row.last_message_text,
        row.last_message_body
      );
      
      if (isGroupChat) {
        groupChats.push(processGroupChat(row, lastMessage));
      } else {
        processIndividualChat(row, lastMessage, individualChats);
      }
    }
    
    const grouped = new Map();
    individualChats.forEach((v, k) => grouped.set(k, v));
    groupChats.forEach(g => grouped.set(g.contact_id, g));
    
    const conversations = [...grouped.values()]
      .sort((a, b) => b.last_message_date - a.last_message_date)
      .map(c => ({
        ...c,
        last_message_date: convertMacTime(c.last_message_date)
      }));
    
    res.json(conversations);
  } catch (err) {
    logger.error('conversations', 'Conversations fetch error', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /conversation/:id - Get messages in a conversation
 * 
 * Query params:
 * - limit: Number of messages (default: 200)
 * - before: Get messages before this message ID
 * - after: Get messages after this message ID
 * - around: Get messages centered around this message ID (for scroll-to-message)
 */
router.get('/conversation/:id', async (req, res) => {
  const chatIds = parseChatIds(req.params.id);
  
  if (chatIds.length === 0) {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  try {
    const placeholders = chatIds.map(() => '?').join(',');
    const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
    const beforeId = parseInt(req.query.before) || 0;
    const afterId = parseInt(req.query.after) || 0;
    const aroundId = parseInt(req.query.around) || 0;

    // Get contact info and stats in parallel
    const [contactRow, stats] = await Promise.all([
      dbGet(`
        SELECT h.id as contact_identifier
        FROM chat_handle_join chj
        JOIN handle h ON chj.handle_id = h.ROWID
        WHERE chj.chat_id IN (${placeholders})
        LIMIT 1
      `, chatIds),
      getConversationStats(chatIds)
    ]);
    
    const contactIdentifier = contactRow?.contact_identifier || 'Unknown';
    const displayName = getDisplayName(contactIdentifier);
    
    let messages;
    let hasMoreOlder = false;
    let hasMoreNewer = false;
    
    // Handle "around" parameter - get messages centered around target message
    if (aroundId) {
      const targetRow = await dbGet(`SELECT date FROM message WHERE ROWID = ?`, [aroundId]);
      if (targetRow) {
        const halfLimit = Math.floor(limit / 2);
        
        // Get messages before the target (older) - fetch one extra to check if more exist
        const beforeMessages = await dbAll(`
          SELECT 
            m.ROWID as id, m.text, m.attributedBody, m.is_from_me, m.date,
            m.cache_has_attachments, m.handle_id, h.id as sender_id
          FROM message m
          JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
          LEFT JOIN handle h ON m.handle_id = h.ROWID
          WHERE cmj.chat_id IN (${placeholders}) AND m.date < ?
          GROUP BY m.ROWID
          ORDER BY m.date DESC
          LIMIT ${halfLimit + 1}
        `, [...chatIds, targetRow.date]);
        
        // Check if there are more older messages
        hasMoreOlder = beforeMessages.length > halfLimit;
        const olderToInclude = hasMoreOlder ? beforeMessages.slice(0, halfLimit) : beforeMessages;
        
        // Get the target message and messages after it (newer) - fetch extra to check if more exist
        const afterMessages = await dbAll(`
          SELECT 
            m.ROWID as id, m.text, m.attributedBody, m.is_from_me, m.date,
            m.cache_has_attachments, m.handle_id, h.id as sender_id
          FROM message m
          JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
          LEFT JOIN handle h ON m.handle_id = h.ROWID
          WHERE cmj.chat_id IN (${placeholders}) AND m.date >= ?
          GROUP BY m.ROWID
          ORDER BY m.date ASC
          LIMIT ${halfLimit + 2}
        `, [...chatIds, targetRow.date]);
        
        // Check if there are more newer messages (beyond target + halfLimit)
        hasMoreNewer = afterMessages.length > halfLimit + 1;
        const newerToInclude = hasMoreNewer ? afterMessages.slice(0, halfLimit + 1) : afterMessages;
        
        // Combine: older messages (reversed to chronological) + target + newer messages
        messages = [...olderToInclude.reverse(), ...newerToInclude];
      } else {
        // Target not found, fall back to recent messages
        messages = await dbAll(`
          SELECT 
            m.ROWID as id, m.text, m.attributedBody, m.is_from_me, m.date,
            m.cache_has_attachments, m.handle_id, h.id as sender_id
          FROM message m
          JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
          LEFT JOIN handle h ON m.handle_id = h.ROWID
          WHERE cmj.chat_id IN (${placeholders})
          GROUP BY m.ROWID
          ORDER BY m.date DESC
          LIMIT ${limit}
        `, chatIds);
        messages = messages.reverse();
        hasMoreOlder = messages.length === limit;
      }
    } else {
      // Standard before/after pagination
      let whereClause = `WHERE cmj.chat_id IN (${placeholders})`;
      let orderClause = 'ORDER BY m.date DESC';
      const params = [...chatIds];
      
      if (beforeId) {
        const beforeRow = await dbGet(`SELECT date FROM message WHERE ROWID = ?`, [beforeId]);
        if (beforeRow) {
          whereClause += ` AND m.date < ?`;
          params.push(beforeRow.date);
        }
      } else if (afterId) {
        const afterRow = await dbGet(`SELECT date FROM message WHERE ROWID = ?`, [afterId]);
        if (afterRow) {
          whereClause += ` AND m.date > ?`;
          params.push(afterRow.date);
        }
        orderClause = 'ORDER BY m.date ASC';
      }
      
      // Fetch messages
      messages = await dbAll(`
        SELECT 
          m.ROWID as id, 
          m.text,
          m.attributedBody,
          m.is_from_me,
          m.date,
          m.cache_has_attachments,
          m.handle_id,
          h.id as sender_id
        FROM message m
        JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        ${whereClause}
        GROUP BY m.ROWID
        ${orderClause}
        LIMIT ${limit}
      `, params);
      
      // Always return in chronological order (oldest first)
      if (orderClause.includes('DESC')) {
        messages = messages.reverse();
      }
    }
    
    // Get attachments in parallel
    const messageIds = messages.filter(m => m.cache_has_attachments).map(m => m.id);
    let attachmentMap = new Map();
    
    if (messageIds.length > 0) {
      const msgPlaceholders = messageIds.map(() => '?').join(',');
      const attachments = await dbAll(`
        SELECT 
          maj.message_id,
          a.ROWID as attachment_id,
          a.filename,
          a.mime_type,
          a.transfer_name,
          a.total_bytes
        FROM message_attachment_join maj
        JOIN attachment a ON maj.attachment_id = a.ROWID
        WHERE maj.message_id IN (${msgPlaceholders})
      `, messageIds);
      
      attachmentMap = await processAttachments(attachments);
    }
    
    const result = messages.map(row => {
      const text = getMessageText(row);
      return {
        id: row.id,
        text,
        is_from_me: row.is_from_me,
        date: convertMacTime(row.date),
        contact_identifier: contactIdentifier,
        display_name: displayName,
        sender_name: row.is_from_me ? 'You' : getDisplayName(row.sender_id),
        attachments: attachmentMap.get(row.id) || [],
        links: extractUrls(text)
      };
    });
    
    // Determine hasMore based on query type
    let finalHasMore = hasMoreOlder;
    let finalHasMoreNewer = hasMoreNewer;
    
    if (!aroundId) {
      if (beforeId) {
        // Loading older - hasMore means more older exist
        finalHasMore = result.length === limit;
        finalHasMoreNewer = false; // We're loading older, newer direction not relevant
      } else if (afterId) {
        // Loading newer - hasMore from this query means more newer exist  
        finalHasMore = false; // We're loading newer, older direction not relevant
        finalHasMoreNewer = result.length === limit;
      } else {
        // Default load (most recent) - hasMore means older exist, no newer
        finalHasMore = result.length === limit;
        finalHasMoreNewer = false;
      }
    }
    
    res.json({
      messages: result,
      total: stats.totalMessages,
      mediaCount: stats.mediaCount,
      linkCount: stats.linkCount,
      hasMore: finalHasMore,
      hasMoreNewer: finalHasMoreNewer,
      oldestId: result.length > 0 ? result[0].id : null,
      newestId: result.length > 0 ? result[result.length - 1].id : null
    });
  } catch (err) {
    logger.error('conversations', 'Conversation fetch error', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /conversation/:id/media - Get all media for a conversation
 */
router.get('/conversation/:id/media', async (req, res) => {
  const chatIds = parseChatIds(req.params.id);
  
  if (chatIds.length === 0) {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  try {
    const placeholders = chatIds.map(() => '?').join(',');
    const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    
    const rows = await dbAll(`
      SELECT 
        a.ROWID as attachment_id,
        a.filename,
        a.mime_type,
        a.transfer_name,
        a.total_bytes,
        m.ROWID as message_id,
        m.date,
        m.is_from_me
      FROM attachment a
      JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
      JOIN message m ON maj.message_id = m.ROWID
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id IN (${placeholders})
        AND (a.mime_type LIKE 'image/%' OR a.mime_type LIKE 'video/%'
             OR a.filename LIKE '%.jpg' OR a.filename LIKE '%.jpeg' 
             OR a.filename LIKE '%.png' OR a.filename LIKE '%.heic'
             OR a.filename LIKE '%.mov' OR a.filename LIKE '%.mp4')
        AND a.filename NOT LIKE '%pluginPayloadAttachment%'
      GROUP BY a.ROWID
      ORDER BY m.date ${sort}
    `, chatIds);
    
    // Process with parallel file checks
    const paths = rows.map(row => expandPath(row.filename));
    const existsResults = await batchFileExists(paths);
    
    const media = [];
    rows.forEach((row, idx) => {
      const type = getAttachmentType(row.mime_type, row.filename);
      if (existsResults[idx] && (type === 'image' || type === 'video')) {
        media.push({
          id: row.attachment_id,
          filename: row.transfer_name || path.basename(row.filename || ''),
          type,
          url: `/attachment/${row.attachment_id}`,
          thumbUrl: `/thumb/${row.attachment_id}`,
          date: convertMacTime(row.date),
          is_from_me: row.is_from_me,
          message_id: row.message_id
        });
      }
    });
    
    res.json({ media });
  } catch (err) {
    logger.error('conversations', 'Conversation media fetch error', err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

/**
 * GET /conversation/:id/links - Get all links for a conversation
 */
router.get('/conversation/:id/links', async (req, res) => {
  const chatIds = parseChatIds(req.params.id);
  
  if (chatIds.length === 0) {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  try {
    const placeholders = chatIds.map(() => '?').join(',');
    
    const rows = await dbAll(`
      SELECT 
        m.ROWID as message_id,
        m.text,
        m.attributedBody,
        m.date,
        m.is_from_me
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id IN (${placeholders})
        AND m.text LIKE '%http%'
      GROUP BY m.ROWID
      ORDER BY m.date DESC
    `, chatIds);
    
    const seen = new Set();
    const links = [];
    
    rows.forEach(row => {
      const text = getMessageText(row);
      const urls = extractUrls(text);
      
      urls.forEach(url => {
        if (!seen.has(url)) {
          seen.add(url);
          links.push({
            url,
            date: convertMacTime(row.date),
            is_from_me: row.is_from_me,
            message_id: row.message_id
          });
        }
      });
    });
    
    res.json({ links });
  } catch (err) {
    logger.error('conversations', 'Conversation links fetch error', err);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

module.exports = router;
