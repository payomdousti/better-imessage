/**
 * Search routes
 * @module routes/search
 */

const express = require('express');
const { dbAll } = require('../db/connection');
const { getDisplayName, getContactGroupMap } = require('../db/contacts');
const { convertMacTime } = require('../helpers/time');
const { searchIndex, getIndexStats } = require('../services/searchIndex');
const logger = require('../helpers/logger');
const { DEFAULT_SEARCH_PAGE_SIZE, MAX_SEARCH_SCAN_LIMIT } = require('../config');

const router = express.Router();

// ============================================================
// Shared helpers (imported from common location)
// ============================================================

const { buildContactFilter } = require('../helpers/filters');

// ============================================================
// Route handlers
// ============================================================

/**
 * GET /search - Search messages using pre-built index
 * 
 * The search index pre-extracts text from attributedBody blobs,
 * avoiding the need to load 40K+ binary blobs into memory per search.
 */
router.get('/search', async (req, res) => {
  const query = req.query.q || '';
  const limit = parseInt(req.query.limit) || DEFAULT_SEARCH_PAGE_SIZE;
  const page = parseInt(req.query.page) || 1;
  const contactIds = req.query.contacts ? req.query.contacts.split(',') : [];
  
  if (!query.trim()) {
    return res.json({ results: [], page, limit, total: 0 });
  }
  
  const { filter: contactFilter, params: filterParams } = buildContactFilter(contactIds);

  try {
    logger.debug('search', `Query: "${query}", Page: ${page}, Limit: ${limit}`);
    
    // Search the pre-built index (fast - no binary blob scanning)
    const indexMatches = await searchIndex(query, { 
      limit: MAX_SEARCH_SCAN_LIMIT,
      contactFilter, 
      filterParams 
    });
    
    logger.debug('search', `Index matches: ${indexMatches.length}`);
    
    // Apply contact filtering if needed
    let filteredMatches = indexMatches;
    if (contactIds.length > 0) {
      const contactGroupMap = getContactGroupMap();
      const allowedChatIds = new Set();
      
      // Get all chat IDs for the selected contacts
      for (const contactId of contactIds) {
        const group = contactGroupMap.get(contactId);
        if (group) {
          // We need to look up chat IDs for these identifiers
          const chatRows = await dbAll(`
            SELECT DISTINCT chj.chat_id 
            FROM chat_handle_join chj
            JOIN handle h ON chj.handle_id = h.ROWID
            WHERE h.id IN (${[...group.identifiers].map(() => '?').join(',')})
          `, [...group.identifiers]);
          
          chatRows.forEach(r => allowedChatIds.add(r.chat_id));
        }
      }
      
      if (allowedChatIds.size > 0) {
        filteredMatches = indexMatches.filter(m => allowedChatIds.has(m.chat_id));
      }
    }
    
    // Apply pagination
    const total = filteredMatches.length;
    const offset = (page - 1) * limit;
    const paginatedMatches = filteredMatches.slice(offset, offset + limit);
    
    // Enrich with contact info
    const results = await Promise.all(paginatedMatches.map(async (row) => {
      // Get contact identifier for this chat
      const contactRow = await dbAll(`
        SELECT h.id as contact_identifier
        FROM chat_handle_join chj
        JOIN handle h ON chj.handle_id = h.ROWID
        WHERE chj.chat_id = ?
        LIMIT 1
      `, [row.chat_id]);
      
      const contactIdentifier = contactRow[0]?.contact_identifier || 'Unknown';
      
      return {
        message_id: row.message_id,
        text: row.text,
        conversation_id: row.chat_id,
        contact_identifier: contactIdentifier,
        date: convertMacTime(row.date),
        display_name: getDisplayName(contactIdentifier)
      };
    }));
    
    logger.debug('search', `Returning ${results.length} results, total: ${total}`);
    
    res.json({ results, page, limit, total });
  } catch (err) {
    logger.error('search', 'Search failed', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /search/stats - Get search index statistics
 */
router.get('/search/stats', async (req, res) => {
  try {
    const stats = await getIndexStats();
    res.json(stats);
  } catch (err) {
    logger.error('search', 'Failed to get index stats', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
