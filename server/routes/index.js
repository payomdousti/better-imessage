/**
 * Route registry - exports all routes
 */

const statusRoutes = require('./status');
const contactsRoutes = require('./contacts');
const searchRoutes = require('./search');
const conversationsRoutes = require('./conversations');
const mediaRoutes = require('./media');
const linksRoutes = require('./links');
const insightsRoutes = require('./insights');

function registerRoutes(app) {
  app.use('/', statusRoutes);
  app.use('/', contactsRoutes);
  app.use('/', searchRoutes);
  app.use('/', conversationsRoutes);
  app.use('/', mediaRoutes);
  app.use('/', linksRoutes);
  app.use('/', insightsRoutes);
}

module.exports = { registerRoutes };

