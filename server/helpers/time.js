/**
 * Time conversion utilities for iMessage timestamps
 */

const { MAC_EPOCH_MS } = require('../config');

/**
 * Convert Mac Absolute Time (nanoseconds since 2001-01-01) to JavaScript timestamp (ms since 1970)
 */
function convertMacTime(macTime) {
  if (macTime == null) return null; // Only reject null/undefined, not 0
  return Math.floor(macTime / 1000000) + MAC_EPOCH_MS;
}

module.exports = {
  convertMacTime
};

