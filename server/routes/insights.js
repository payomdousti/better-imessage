/**
 * Insights routes
 */

const express = require('express');
const { computeInsights } = require('../services/insights');

const router = express.Router();

/**
 * GET /insights - Get comprehensive analytics
 */
router.get('/insights', async (req, res) => {
  try {
    const insights = await computeInsights();
    res.json(insights);
  } catch (err) {
    const logger = require('../helpers/logger');
    logger.error('insights', 'Insights computation error', err);
    res.status(500).json({ error: 'Failed to compute insights' });
  }
});

module.exports = router;

