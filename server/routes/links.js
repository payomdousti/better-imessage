/**
 * Link routes
 * @module routes/links
 */

const express = require('express');
const { dbAll } = require('../db/connection');
const { getDisplayName } = require('../db/contacts');
const { getMessageText, extractUrls } = require('../helpers/text');
const { convertMacTime } = require('../helpers/time');
const { buildHandleFilter } = require('../helpers/filters');
const logger = require('../helpers/logger');

const router = express.Router();

// ============================================================
// Pure functions for data transformation
// ============================================================

/**
 * Extract meta content from HTML using multiple patterns
 */
const getMetaContent = (html, property) => {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * Parse HTML page for Open Graph / meta data
 */
const parsePageMetadata = (html, url) => {
  let title = getMetaContent(html, 'og:title') || getMetaContent(html, 'twitter:title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1] : null;
  }
  
  const description = getMetaContent(html, 'og:description') 
    || getMetaContent(html, 'twitter:description') 
    || getMetaContent(html, 'description');
  
  const image = getMetaContent(html, 'og:image') || getMetaContent(html, 'twitter:image');
  
  let siteName;
  try {
    siteName = getMetaContent(html, 'og:site_name') || new URL(url).hostname;
  } catch {
    siteName = null;
  }
  
  return {
    url,
    title: title ? title.substring(0, 200) : null,
    description: description ? description.substring(0, 300) : null,
    image,
    siteName
  };
};

/**
 * Extract unique links from message rows
 */
const extractLinksFromRows = (rows) => {
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
          contact: getDisplayName(row.contact_identifier),
          is_from_me: row.is_from_me
        });
      }
    });
  });
  
  return links;
};

// ============================================================
// Route handlers
// ============================================================

/**
 * GET /link-preview - Fetch metadata for a URL (with caching)
 */
router.get('/link-preview', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    const { fetchLinkPreview } = require('../services/linkPreviewCache');
    const preview = await fetchLinkPreview(url);
    res.json(preview);
  } catch (err) {
    logger.error('links', 'Link preview fetch failed', err);
    // Return minimal data on error
    try {
      const hostname = new URL(url).hostname;
      res.json({ url, siteName: hostname, title: null, description: null, image: null });
    } catch {
      res.json({ url, siteName: null, title: null, description: null, image: null });
    }
  }
});

/**
 * GET /global/links - Get all links across conversations
 */
router.get('/global/links', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const contactIds = req.query.contacts ? req.query.contacts.split(',') : [];
  
  const { filter: contactFilter, params: filterParams } = buildHandleFilter(contactIds);
  
  try {
    const rows = await dbAll(`
      SELECT 
        m.ROWID as message_id,
        m.text,
        m.attributedBody,
        m.date,
        m.is_from_me,
        h.id as contact_identifier
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      JOIN chat_handle_join chj ON cmj.chat_id = chj.chat_id
      JOIN handle h ON chj.handle_id = h.ROWID
      WHERE m.text LIKE '%http%'
      ${contactFilter}
      GROUP BY m.ROWID
      ORDER BY m.date DESC
      LIMIT ? OFFSET ?
    `, [...filterParams, limit, offset]);
    
    const links = extractLinksFromRows(rows);
    
    res.json({ links, hasMore: rows.length === limit });
  } catch (err) {
    logger.error('links', 'Global links fetch error', err);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

module.exports = router;
