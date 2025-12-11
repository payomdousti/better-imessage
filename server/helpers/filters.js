/**
 * SQL filter building helpers
 * @module helpers/filters
 */

const { getContactGroupMap } = require('../db/contacts');

/**
 * Build contact filter SQL and params for queries
 * @param {string[]} contactIds - Array of contact IDs to filter by
 * @returns {{ filter: string, params: any[] }}
 */
function buildContactFilter(contactIds) {
  if (!contactIds || contactIds.length === 0) {
    return { filter: '', params: [] };
  }
  
  const contactGroupMap = getContactGroupMap();
  const allIdentifiers = new Set();
  
  contactIds.forEach(contactId => {
    const group = contactGroupMap.get(contactId);
    if (group) {
      group.identifiers.forEach(id => allIdentifiers.add(id));
    }
  });
  
  if (allIdentifiers.size === 0) {
    return { filter: '', params: [] };
  }
  
  const placeholders = [...allIdentifiers].map(() => '?').join(',');
  return {
    filter: ` AND cmj.chat_id IN (
      SELECT DISTINCT chj.chat_id FROM chat_handle_join chj
      JOIN handle h ON chj.handle_id = h.ROWID
      WHERE h.id IN (${placeholders})
    )`,
    params: [...allIdentifiers]
  };
}

/**
 * Build contact filter for queries using handle table directly
 * @param {string[]} contactIds - Array of contact IDs to filter by
 * @returns {{ filter: string, params: any[] }}
 */
function buildHandleFilter(contactIds) {
  if (!contactIds || contactIds.length === 0) {
    return { filter: '', params: [] };
  }
  
  const contactGroupMap = getContactGroupMap();
  const allIdentifiers = new Set();
  
  contactIds.forEach(contactId => {
    const group = contactGroupMap.get(contactId);
    if (group) {
      group.identifiers.forEach(id => allIdentifiers.add(id));
    }
  });
  
  if (allIdentifiers.size === 0) {
    return { filter: '', params: [] };
  }
  
  const placeholders = [...allIdentifiers].map(() => '?').join(',');
  return {
    filter: ` AND h.id IN (${placeholders})`,
    params: [...allIdentifiers]
  };
}

module.exports = {
  buildContactFilter,
  buildHandleFilter
};
