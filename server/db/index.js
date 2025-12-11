/**
 * Re-export all database modules
 */

module.exports = {
  ...require('./connection'),
  ...require('./contacts')
};

