/**
 * Contacts routes
 * @module routes/contacts
 */

const express = require('express');
const { dbAll } = require('../db/connection');
const { getDisplayName, getContactId } = require('../db/contacts');

const router = express.Router();

/**
 * Build contact list with grouping and disambiguation
 */
const buildContactList = (rows) => {
  const groupedContacts = new Map();
  const ungroupedContacts = [];
  
  rows.forEach(row => {
    const contactId = getContactId(row.identifier);
    const displayName = getDisplayName(row.identifier);
    
    if (contactId) {
      if (!groupedContacts.has(contactId)) {
        groupedContacts.set(contactId, {
          contact_id: contactId,
          display_name: displayName,
          identifiers: [],
          message_count: 0
        });
      }
      const group = groupedContacts.get(contactId);
      group.identifiers.push(row.identifier);
      group.message_count += row.message_count;
    } else {
      ungroupedContacts.push({
        contact_id: `unknown-${row.id}`,
        display_name: displayName,
        identifiers: [row.identifier],
        message_count: row.message_count
      });
    }
  });
  
  const allContacts = [...groupedContacts.values(), ...ungroupedContacts];
  allContacts.sort((a, b) => b.message_count - a.message_count);
  
  // Add disambiguation for duplicate names
  const nameCount = new Map();
  allContacts.forEach(c => nameCount.set(c.display_name, (nameCount.get(c.display_name) || 0) + 1));
  
  allContacts.forEach(c => {
    if (nameCount.get(c.display_name) > 1) {
      const hint = c.identifiers[0];
      c.disambiguation = hint.includes('@') 
        ? hint.split('@')[1]
        : hint.replace(/\D/g, '').slice(-4);
    }
  });
  
  return allContacts;
};

/**
 * GET /contacts - Get all contacts with message counts
 */
router.get('/contacts', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT 
        h.ROWID as id, 
        h.id as identifier, 
        COUNT(DISTINCT cmj.message_id) as message_count
      FROM handle h
      JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
      JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
      GROUP BY h.ROWID
    `);
    
    const contacts = buildContactList(rows);
    res.json(contacts);
  } catch (err) {
    const logger = require('../helpers/logger');
    logger.error('contacts', 'Contacts fetch error', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

module.exports = router;
