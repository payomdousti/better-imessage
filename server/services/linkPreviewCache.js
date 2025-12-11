/**
 * Link Preview Cache Service
 * 
 * Caches link preview metadata in SQLite to avoid repeated HTTP fetches.
 * Previews are cached for 7 days by default.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { CACHE_DIR } = require('../config');
const logger = require('../helpers/logger');

// Cache configuration
const CACHE_DB_PATH = path.join(CACHE_DIR, 'link_previews.db');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 5000;

let cacheDb = null;

/**
 * Get or create the cache database connection
 */
function getCacheDb() {
  if (cacheDb) return cacheDb;
  
  cacheDb = new sqlite3.Database(CACHE_DB_PATH, (err) => {
    if (err) {
      logger.error('linkPreviewCache', 'Failed to open cache database', err);
    }
  });
  
  return cacheDb;
}

/**
 * Promisified db operations
 */
function cacheDbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getCacheDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function cacheDbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getCacheDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Initialize cache schema
 */
async function initializeCache() {
  await cacheDbRun(`
    CREATE TABLE IF NOT EXISTS link_previews (
      url TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      image TEXT,
      site_name TEXT,
      fetched_at INTEGER,
      error TEXT
    )
  `);
  
  await cacheDbRun(`
    CREATE INDEX IF NOT EXISTS idx_fetched_at 
    ON link_previews(fetched_at)
  `);
  
  logger.debug('linkPreviewCache', 'Cache initialized');
}

/**
 * Get cached preview for a URL
 * @param {string} url - URL to look up
 * @returns {Object|null} - Cached preview or null if not found/expired
 */
async function getCachedPreview(url) {
  try {
    const row = await cacheDbGet(
      `SELECT * FROM link_previews WHERE url = ?`,
      [url]
    );
    
    if (!row) return null;
    
    // Check if cache is expired
    const age = Date.now() - row.fetched_at;
    if (age > CACHE_TTL_MS) {
      return null; // Expired
    }
    
    // Return cached data (even if it was an error)
    if (row.error) {
      return { url, siteName: null, title: null, description: null, image: null, cached: true, error: row.error };
    }
    
    return {
      url,
      title: row.title,
      description: row.description,
      image: row.image,
      siteName: row.site_name,
      cached: true
    };
  } catch (err) {
    logger.error('linkPreviewCache', 'Failed to get cached preview', err);
    return null;
  }
}

/**
 * Store preview in cache
 */
async function setCachedPreview(url, preview, error = null) {
  try {
    await cacheDbRun(`
      INSERT OR REPLACE INTO link_previews 
      (url, title, description, image, site_name, fetched_at, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      url,
      preview?.title || null,
      preview?.description || null,
      preview?.image || null,
      preview?.siteName || null,
      Date.now(),
      error
    ]);
  } catch (err) {
    logger.error('linkPreviewCache', 'Failed to cache preview', err);
  }
}

/**
 * Extract meta content from HTML
 */
function getMetaContent(html, property) {
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
}

/**
 * Parse HTML for Open Graph metadata
 */
function parseMetadata(html, url) {
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
}

/**
 * Fetch and cache link preview
 * @param {string} url - URL to fetch preview for
 * @returns {Object} - Preview metadata
 */
async function fetchLinkPreview(url) {
  // Check cache first
  const cached = await getCachedPreview(url);
  if (cached) {
    return cached;
  }
  
  // Fetch from URL
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    
    const html = await response.text();
    const preview = parseMetadata(html, url);
    
    // Cache the result
    await setCachedPreview(url, preview);
    
    return preview;
  } catch (err) {
    // Cache the error to avoid repeated failed fetches
    const errorMsg = err.name === 'AbortError' ? 'Timeout' : err.message;
    await setCachedPreview(url, null, errorMsg);
    
    // Return minimal data
    try {
      const hostname = new URL(url).hostname;
      return { url, siteName: hostname, title: null, description: null, image: null };
    } catch {
      return { url, siteName: null, title: null, description: null, image: null };
    }
  }
}

/**
 * Clean up old cache entries
 */
async function cleanupCache() {
  try {
    const cutoff = Date.now() - CACHE_TTL_MS;
    await cacheDbRun(`DELETE FROM link_previews WHERE fetched_at < ?`, [cutoff]);
    logger.debug('linkPreviewCache', 'Cleaned up old cache entries');
  } catch (err) {
    logger.error('linkPreviewCache', 'Failed to cleanup cache', err);
  }
}

/**
 * Close cache database connection
 */
function closeCache() {
  if (cacheDb) {
    cacheDb.close();
    cacheDb = null;
  }
}

module.exports = {
  initializeCache,
  fetchLinkPreview,
  getCachedPreview,
  cleanupCache,
  closeCache
};
