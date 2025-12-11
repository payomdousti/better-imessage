/**
 * Application configuration
 * @module config
 * 
 * All magic numbers and configuration values should be defined here
 * with clear documentation of their purpose.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// ============================================================
// Server configuration
// ============================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// ============================================================
// Database paths
// ============================================================

const IMESSAGE_DB_PATH = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
const CONTACTS_BASE_PATH = path.join(os.homedir(), 'Library', 'Application Support', 'AddressBook');
const ATTACHMENTS_BASE_PATH = path.join(os.homedir(), 'Library', 'Messages', 'Attachments');

// ============================================================
// Time constants
// ============================================================

// Mac Absolute Time epoch (2001-01-01 00:00:00 UTC in milliseconds)
const MAC_EPOCH_MS = 978307200000;

// Mac time is stored in nanoseconds, divide by this to get seconds
const MAC_TIME_DIVISOR = 1000000000;

// ============================================================
// Cache configuration
// ============================================================

const CACHE_DIR = path.join(os.homedir(), '.imessage-search-cache');
const THUMB_DIR = path.join(CACHE_DIR, 'thumbnails');
const HEIC_DIR = path.join(CACHE_DIR, 'heic-converted');

// ============================================================
// Pagination defaults
// ============================================================

// Default number of messages to load per conversation page
const DEFAULT_CONVERSATION_PAGE_SIZE = 200;

// Default number of search results per page
const DEFAULT_SEARCH_PAGE_SIZE = 20;

// Maximum search results to scan before pagination
const MAX_SEARCH_SCAN_LIMIT = 10000;

// Default number of media items per page
const DEFAULT_MEDIA_PAGE_SIZE = 100;

// Default number of links per page
const DEFAULT_LINKS_PAGE_SIZE = 100;

// ============================================================
// Search index configuration
// ============================================================

// Number of messages to index per batch
const SEARCH_INDEX_BATCH_SIZE = 5000;

// How often to check for new messages to index (ms)
const SEARCH_INDEX_UPDATE_INTERVAL = 30000;

// ============================================================
// Link preview configuration
// ============================================================

// How long to cache link previews (ms) - 7 days
const LINK_PREVIEW_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Timeout for fetching link previews (ms)
const LINK_PREVIEW_FETCH_TIMEOUT = 5000;

// Maximum number of link previews to cache (LRU eviction after this)
const MAX_LINK_PREVIEW_CACHE_SIZE = 1000;

// ============================================================
// Insights configuration
// ============================================================

// Number of top contacts to include in insights
const INSIGHTS_TOP_CONTACTS_LIMIT = 50;

// Number of raw contacts to fetch before deduplication
const INSIGHTS_RAW_CONTACTS_LIMIT = 200;

// Maximum number of nodes in network graph
const INSIGHTS_MAX_NETWORK_NODES = 100;

// Maximum number of edges in network graph
const INSIGHTS_MAX_NETWORK_EDGES = 200;

// Number of months to include in activity timeline
const INSIGHTS_TIMELINE_MONTHS = 24;

// ============================================================
// Binary plist parsing
// ============================================================

// Maximum offset to search for '+' marker after NSString (bytes)
const PLIST_MAX_MARKER_OFFSET = 80;

// Byte values used in binary plist parsing
const PLIST_MARKERS = {
  PLUS: 0x2b,           // '+' marks start of length encoding
  END: 0x86,            // Marks end of text
  SINGLE_BYTE_MAX: 0x80, // Length values below this are single-byte
  TWO_BYTE: 0x81,       // Indicates 2-byte length follows
  THREE_BYTE: 0x82,     // Indicates 3-byte length follows
  FOUR_BYTE: 0x83       // Indicates 4-byte length follows
};

// ============================================================
// Parallelization configuration
// ============================================================

const CPU_COUNT = os.cpus().length;

// Number of concurrent workers for media processing
const MEDIA_PROCESSOR_CONCURRENCY = Math.min(32, Math.max(8, CPU_COUNT * 2));

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize cache directories
 */
const initCacheDirectories = () => {
  [CACHE_DIR, THUMB_DIR, HEIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Server
  PORT,
  HOST,
  
  // Database paths
  IMESSAGE_DB_PATH,
  CONTACTS_BASE_PATH,
  ATTACHMENTS_BASE_PATH,
  
  // Time
  MAC_EPOCH_MS,
  MAC_TIME_DIVISOR,
  
  // Cache directories
  CACHE_DIR,
  THUMB_DIR,
  HEIC_DIR,
  
  // Pagination
  DEFAULT_CONVERSATION_PAGE_SIZE,
  DEFAULT_SEARCH_PAGE_SIZE,
  MAX_SEARCH_SCAN_LIMIT,
  DEFAULT_MEDIA_PAGE_SIZE,
  DEFAULT_LINKS_PAGE_SIZE,
  
  // Search index
  SEARCH_INDEX_BATCH_SIZE,
  SEARCH_INDEX_UPDATE_INTERVAL,
  
  // Link previews
  LINK_PREVIEW_CACHE_TTL,
  LINK_PREVIEW_FETCH_TIMEOUT,
  MAX_LINK_PREVIEW_CACHE_SIZE,
  
  // Insights
  INSIGHTS_TOP_CONTACTS_LIMIT,
  INSIGHTS_RAW_CONTACTS_LIMIT,
  INSIGHTS_MAX_NETWORK_NODES,
  INSIGHTS_MAX_NETWORK_EDGES,
  INSIGHTS_TIMELINE_MONTHS,
  
  // Plist parsing
  PLIST_MAX_MARKER_OFFSET,
  PLIST_MARKERS,
  
  // Parallelization
  CPU_COUNT,
  MEDIA_PROCESSOR_CONCURRENCY,
  
  // Functions
  initCacheDirectories
};
