/**
 * Search Index Service
 * 
 * Pre-extracts text from attributedBody blobs and stores in a SQLite cache
 * for fast full-text search. This avoids loading 40K+ binary blobs into
 * memory on every search query.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { CACHE_DIR, SEARCH_INDEX_BATCH_SIZE } = require('../config');
const { dbAll, dbGet } = require('../db/connection');
const { extractTextFromAttributedBody } = require('../helpers/text');
const logger = require('../helpers/logger');

// Search index database path
const SEARCH_INDEX_PATH = path.join(CACHE_DIR, 'search_index.db');

// Index database connection
let indexDb = null;

/**
 * Get or create the search index database connection
 */
function getIndexDb() {
  if (indexDb) return indexDb;
  
  indexDb = new sqlite3.Database(SEARCH_INDEX_PATH, (err) => {
    if (err) {
      logger.error('searchIndex', 'Failed to open search index database', err);
    }
  });
  
  return indexDb;
}

/**
 * Promisified db operations for index database
 */
function indexDbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getIndexDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function indexDbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getIndexDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function indexDbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getIndexDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Initialize the search index schema
 */
async function initializeSchema() {
  await indexDbRun(`
    CREATE TABLE IF NOT EXISTS message_text (
      message_id INTEGER PRIMARY KEY,
      text TEXT,
      date INTEGER,
      chat_id INTEGER
    )
  `);
  
  await indexDbRun(`
    CREATE INDEX IF NOT EXISTS idx_message_text_text 
    ON message_text(text)
  `);
  
  await indexDbRun(`
    CREATE INDEX IF NOT EXISTS idx_message_text_date 
    ON message_text(date DESC)
  `);
  
  await indexDbRun(`
    CREATE TABLE IF NOT EXISTS index_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

/**
 * Get the last indexed message ID
 */
async function getLastIndexedId() {
  const row = await indexDbGet(
    `SELECT value FROM index_metadata WHERE key = 'last_message_id'`
  );
  return row ? parseInt(row.value) : 0;
}

/**
 * Set the last indexed message ID
 */
async function setLastIndexedId(messageId) {
  await indexDbRun(
    `INSERT OR REPLACE INTO index_metadata (key, value) VALUES ('last_message_id', ?)`,
    [String(messageId)]
  );
}

/**
 * Index new messages since last indexed ID
 * Returns the number of messages indexed
 */
async function indexNewMessages(batchSize = 1000) {
  const lastId = await getLastIndexedId();
  
  // Get messages that need indexing
  const messages = await dbAll(`
    SELECT 
      m.ROWID as message_id,
      m.text,
      m.attributedBody,
      m.date,
      cmj.chat_id
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    WHERE m.ROWID > ?
    ORDER BY m.ROWID ASC
    LIMIT ?
  `, [lastId, batchSize]);
  
  if (messages.length === 0) {
    return 0;
  }
  
  // Begin transaction for batch insert
  await indexDbRun('BEGIN TRANSACTION');
  
  try {
    let maxId = lastId;
    
    for (const msg of messages) {
      // Get text from either column or attributedBody
      let text = msg.text;
      if ((!text || text.trim().length < 2) && msg.attributedBody) {
        text = extractTextFromAttributedBody(msg.attributedBody);
      }
      
      if (text && text.trim()) {
        await indexDbRun(
          `INSERT OR REPLACE INTO message_text (message_id, text, date, chat_id) VALUES (?, ?, ?, ?)`,
          [msg.message_id, text.trim(), msg.date, msg.chat_id]
        );
      }
      
      maxId = Math.max(maxId, msg.message_id);
    }
    
    await setLastIndexedId(maxId);
    await indexDbRun('COMMIT');
    
    return messages.length;
  } catch (err) {
    await indexDbRun('ROLLBACK');
    throw err;
  }
}

/**
 * Build or update the complete search index
 */
async function buildIndex(onProgress) {
  logger.info('searchIndex', 'Starting index build...');
  const startTime = Date.now();
  
  await initializeSchema();
  
  let totalIndexed = 0;
  let batch = 0;
  
  while (true) {
    const indexed = await indexNewMessages(5000);
    totalIndexed += indexed;
    batch++;
    
    if (onProgress) {
      onProgress({ indexed: totalIndexed, batch });
    }
    
    if (indexed < 5000) {
      // No more messages to index
      break;
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('searchIndex', `Indexed ${totalIndexed} messages in ${elapsed}s`);
  
  return totalIndexed;
}

/**
 * Search the index for matching messages
 */
async function searchIndex(query, options = {}) {
  const { limit = 1000, contactFilter = '', filterParams = [] } = options;
  
  // Use LIKE for now (could upgrade to FTS5 for better performance)
  const rows = await indexDbAll(`
    SELECT message_id, text, date, chat_id
    FROM message_text
    WHERE text LIKE ?
    ORDER BY date DESC
    LIMIT ?
  `, [`%${query}%`, limit]);
  
  return rows;
}

/**
 * Get index statistics
 */
async function getIndexStats() {
  const countRow = await indexDbGet(`SELECT COUNT(*) as count FROM message_text`);
  const lastId = await getLastIndexedId();
  
  return {
    indexedMessages: countRow?.count || 0,
    lastIndexedId: lastId
  };
}

/**
 * Check if index needs updating
 */
async function needsUpdate() {
  const lastId = await getLastIndexedId();
  const latestMsg = await dbGet(`SELECT MAX(ROWID) as max_id FROM message`);
  
  return (latestMsg?.max_id || 0) > lastId;
}

/**
 * Close the index database connection
 */
function closeIndex() {
  if (indexDb) {
    indexDb.close();
    indexDb = null;
  }
}

module.exports = {
  buildIndex,
  searchIndex,
  getIndexStats,
  needsUpdate,
  indexNewMessages,
  closeIndex
};
