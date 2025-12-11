/**
 * iMessage Search Server
 * Main entry point
 */

const express = require('express');
const path = require('path');
const { PORT, HOST, initCacheDirectories } = require('./config');
const { getDatabase } = require('./db/connection');
const { loadAllContacts } = require('./db/contacts');
const { mediaProcessor } = require('./processors/media');
const { buildIndex, needsUpdate, indexNewMessages } = require('./services/searchIndex');
const { initializeCache: initLinkPreviewCache, cleanupCache: cleanupLinkPreviews } = require('./services/linkPreviewCache');
const { registerRoutes } = require('./routes');
const logger = require('./helpers/logger');

const app = express();

// Initialize cache directories
initCacheDirectories();

// Determine the public folder path (handles both dev and packaged Electron)
const getPublicPath = () => {
  // Check if running in Electron packaged app
  if (process.resourcesPath && process.resourcesPath.includes('app.asar')) {
    return path.join(process.resourcesPath, 'app.asar', 'public');
  }
  // Check for Electron's extraResources
  if (process.resourcesPath) {
    const extraResourcesPath = path.join(process.resourcesPath, 'public');
    if (require('fs').existsSync(extraResourcesPath)) {
      return extraResourcesPath;
    }
  }
  // Default development path
  return path.join(__dirname, '..', 'public');
};

const publicPath = getPublicPath();
logger.info('server', `Serving static files from: ${publicPath}`);

// Serve static files
app.use(express.static(publicPath));

// Register all routes
registerRoutes(app);

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

/**
 * Start the server
 */
async function start() {
  // Initialize database connection
  const db = getDatabase();
  
  // Load contacts from AddressBook
  await loadAllContacts();
  
  // Initialize link preview cache
  await initLinkPreviewCache();
  
  // Periodically cleanup old link preview cache entries (once per day)
  setInterval(() => {
    cleanupLinkPreviews().catch(err => {
      logger.error('server', 'Failed to cleanup link preview cache', err);
    });
  }, 24 * 60 * 60 * 1000);
  
  // Build/update search index (runs in background after server starts)
  buildIndex().catch(err => {
    logger.error('server', 'Failed to build search index', err);
  });
  
  // Periodically check for new messages and update index
  setInterval(async () => {
    try {
      if (await needsUpdate()) {
        const count = await indexNewMessages(1000);
        if (count > 0) {
          logger.debug('server', `Indexed ${count} new messages`);
        }
      }
    } catch (err) {
      logger.error('server', 'Failed to update search index', err);
    }
  }, 30000); // Check every 30 seconds
  
  // Start background media processor
  await mediaProcessor.initialize(db);
  
  // Start server
  app.listen(PORT, HOST, () => {
    logger.info('server', `Server is running on http://${HOST}:${PORT}`);
  });
}

// Handle uncaught errors (don't exit if running in Electron)
process.on('uncaughtException', (err) => {
  logger.error('server', 'Uncaught exception', err);
  // Only exit if running standalone, not in Electron
  if (require.main === module) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (err) => {
  logger.error('server', 'Unhandled rejection', err);
});

// Start if run directly
if (require.main === module) {
  start().catch(err => {
    logger.error('server', 'Failed to start server', err);
    process.exit(1);
  });
}

module.exports = { app, start };

