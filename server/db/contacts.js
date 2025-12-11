/**
 * Contact database loading and management
 * @module db/contacts
 * 
 * Uses a singleton pattern for the contact store, but the store itself
 * is a class that can be instantiated for testing.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { CONTACTS_BASE_PATH } = require('../config');
const { normalizePhone, normalizeEmail } = require('../helpers/phone');
const logger = require('../helpers/logger');

/**
 * ContactStore class - manages contact data with proper encapsulation
 */
class ContactStore {
  constructor() {
    this.nameMap = new Map();
    this.idMap = new Map();
    this.groupMap = new Map();
    this.loaded = false;
  }

  /**
   * Get display name for an identifier
   */
  getDisplayName(identifier) {
    if (!identifier) return 'Unknown';
    
    // Direct match
    if (this.nameMap.has(identifier)) {
      return this.nameMap.get(identifier);
    }
    
    // Try normalized phone
    const normalizedPhone = normalizePhone(identifier);
    if (normalizedPhone) {
      if (this.nameMap.has(normalizedPhone)) {
        return this.nameMap.get(normalizedPhone);
      }
      // Try with +1 prefix (US format used by iMessage)
      if (this.nameMap.has(`+1${normalizedPhone}`)) {
        return this.nameMap.get(`+1${normalizedPhone}`);
      }
    }
    
    // Try normalized email
    const normalizedEmailAddr = normalizeEmail(identifier);
    if (normalizedEmailAddr && this.nameMap.has(normalizedEmailAddr)) {
      return this.nameMap.get(normalizedEmailAddr);
    }
    
    // Format phone numbers nicely
    if (normalizedPhone && normalizedPhone.length === 10) {
      return `(${normalizedPhone.slice(0,3)}) ${normalizedPhone.slice(3,6)}-${normalizedPhone.slice(6)}`;
    }
    
    return identifier;
  }

  /**
   * Get display names for multiple identifiers (for group chats)
   */
  getGroupMemberNames(participantsStr) {
    if (!participantsStr) return [];
    return participantsStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => this.getDisplayName(p));
  }

  /**
   * Get contact_id for an identifier
   */
  getContactId(identifier) {
    if (!identifier) return null;
    
    if (this.idMap.has(identifier)) {
      return this.idMap.get(identifier);
    }
    
    const normalizedPhone = normalizePhone(identifier);
    if (normalizedPhone && this.idMap.has(normalizedPhone)) {
      return this.idMap.get(normalizedPhone);
    }
    
    const normalizedEmailAddr = normalizeEmail(identifier);
    if (normalizedEmailAddr && this.idMap.has(normalizedEmailAddr)) {
      return this.idMap.get(normalizedEmailAddr);
    }
    
    return null;
  }

  /**
   * Get contact group map (for filtering)
   */
  getContactGroupMap() {
    return this.groupMap;
  }

  /**
   * Add a contact entry
   */
  addContact(identifier, name, contactId) {
    this.nameMap.set(identifier, name);
    this.idMap.set(identifier, contactId);
    
    if (!this.groupMap.has(contactId)) {
      this.groupMap.set(contactId, { name, identifiers: new Set() });
    }
    this.groupMap.get(contactId).identifiers.add(identifier);
  }

  /**
   * Clear all contact data
   */
  clear() {
    this.nameMap.clear();
    this.idMap.clear();
    this.groupMap.clear();
    this.loaded = false;
  }

  /**
   * Get statistics about loaded contacts
   */
  getStats() {
    return {
      names: this.nameMap.size,
      ids: this.idMap.size,
      groups: this.groupMap.size
    };
  }
}

// Singleton instance
const contactStore = new ContactStore();

/**
 * Find all AddressBook database files
 */
function findContactDatabases() {
  const databases = [];
  
  const mainDb = path.join(CONTACTS_BASE_PATH, 'AddressBook-v22.abcddb');
  if (fs.existsSync(mainDb)) {
    databases.push({ path: mainDb, index: 'main' });
  }
  
  const sourcesDir = path.join(CONTACTS_BASE_PATH, 'Sources');
  if (fs.existsSync(sourcesDir)) {
    try {
      const sources = fs.readdirSync(sourcesDir).sort();
      for (const source of sources) {
        const sourceDb = path.join(sourcesDir, source, 'AddressBook-v22.abcddb');
        if (fs.existsSync(sourceDb)) {
          databases.push({ path: sourceDb, index: source });
        }
      }
    } catch {
      // Ignore errors reading sources directory
    }
  }
  
  return databases;
}

/**
 * Promisified SQLite helpers for contact database
 */
function openContactDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function contactDbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function closeContactDb(db) {
  return new Promise((resolve) => {
    db.close(() => resolve());
  });
}

/**
 * Load contacts from a single database (async/await version)
 */
async function loadContactsFromDb(dbPath, dbIndex) {
  let db;
  let phonesLoaded = 0;
  let emailsLoaded = 0;
  
  try {
    db = await openContactDb(dbPath);
    
    // Load phone numbers
    const phoneRows = await contactDbAll(db, `
      SELECT p.ZFULLNUMBER as phone, r.Z_PK as record_id,
        TRIM(COALESCE(r.ZFIRSTNAME || ' ' || r.ZLASTNAME, r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION, r.ZNICKNAME)) as name
      FROM ZABCDPHONENUMBER p
      JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
      WHERE p.ZFULLNUMBER IS NOT NULL
    `);
    
    for (const row of phoneRows) {
      if (!row.name?.trim()) continue;
      
      const name = row.name.trim();
      const contactId = `${dbIndex}-${row.record_id}`;
      const normalized = normalizePhone(row.phone);
      
      // Store all phone format variations
      contactStore.addContact(row.phone, name, contactId);
      
      if (normalized) {
        contactStore.addContact(normalized, name, contactId);
        contactStore.addContact(`+1${normalized}`, name, contactId);
      }
      
      phonesLoaded++;
    }
    
    // Load email addresses
    const emailRows = await contactDbAll(db, `
      SELECT e.ZADDRESS as email, r.Z_PK as record_id,
        TRIM(COALESCE(r.ZFIRSTNAME || ' ' || r.ZLASTNAME, r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION, r.ZNICKNAME)) as name
      FROM ZABCDEMAILADDRESS e
      JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK
      WHERE e.ZADDRESS IS NOT NULL
    `);
    
    for (const row of emailRows) {
      if (!row.name?.trim()) continue;
      
      const name = row.name.trim();
      const contactId = `${dbIndex}-${row.record_id}`;
      
      contactStore.addContact(row.email, name, contactId);
      contactStore.addContact(normalizeEmail(row.email), name, contactId);
      
      emailsLoaded++;
    }
    
  } catch (err) {
    logger.warn('contacts', `Failed to load contacts from ${dbPath}: ${err.message}`);
  } finally {
    if (db) {
      await closeContactDb(db);
    }
  }
  
  return { phones: phonesLoaded, emails: emailsLoaded };
}

/**
 * Load all contacts from all AddressBook databases
 */
async function loadAllContacts() {
  const databases = findContactDatabases();
  logger.info('contacts', `Found ${databases.length} AddressBook databases`);
  
  let totalPhones = 0;
  let totalEmails = 0;
  
  for (const { path: dbPath, index } of databases) {
    const { phones, emails } = await loadContactsFromDb(dbPath, index);
    totalPhones += phones;
    totalEmails += emails;
  }
  
  contactStore.loaded = true;
  
  logger.info('contacts', `Loaded ${totalPhones} phone numbers, ${totalEmails} emails`);
  logger.info('contacts', `Created ${contactStore.groupMap.size} contact groups`);
  
  return contactStore.getStats();
}

// Export singleton methods (maintains backward compatibility)
module.exports = {
  // Instance methods bound to singleton
  getDisplayName: (id) => contactStore.getDisplayName(id),
  getGroupMemberNames: (str) => contactStore.getGroupMemberNames(str),
  getContactId: (id) => contactStore.getContactId(id),
  getContactGroupMap: () => contactStore.getContactGroupMap(),
  
  // Initialization
  loadAllContacts,
  
  // For testing - access to store class and instance
  ContactStore,
  contactStore
};
