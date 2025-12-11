/**
 * Status and health check routes
 */

const express = require('express');
const { mediaProcessor } = require('../processors/media');

const router = express.Router();

/**
 * GET /status - Get media processing status
 */
router.get('/status', (req, res) => {
  res.json(mediaProcessor.getStatus());
});

module.exports = router;

