/**
 * SQLite database connection management
 */

const sqlite3 = require('sqlite3').verbose();
const { IMESSAGE_DB_PATH } = require('../config');
const logger = require('../helpers/logger');

let db = null;

/**
 * Get or create database connection
 */
function getDatabase() {
  if (db) return db;
  
  db = new sqlite3.Database(IMESSAGE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      logger.error('database', 'Failed to connect to iMessage database', err);
      process.exit(1);
    }
    logger.info('database', 'Connected to iMessage database');
  });
  
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Promisified db.all
 */
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Promisified db.get
 */
function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  getDatabase,
  closeDatabase,
  dbAll,
  dbGet
};

