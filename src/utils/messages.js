/**
 * Message processing utilities
 * @module utils/messages
 * 
 * Note: The INVISIBLE_CHARS_REGEX is shared with the backend (server/helpers/unicode.js)
 * Keep them in sync if you modify either.
 */

// ============================================================
// Constants
// ============================================================

// Unicode characters to filter from message text:
// - U+FFFC: Object Replacement Character (attachment placeholder)
// - U+FFFD: Replacement Character (invalid/unknown char)
// - U+200B: Zero Width Space (used in tapback reactions)
// - U+200C: Zero Width Non-Joiner
// - U+200D: Zero Width Joiner
// - U+2060: Word Joiner
// - U+FEFF: Zero Width No-Break Space (BOM)
// - U+200A: Hair Space (also used in tapback text wrappers)
export const INVISIBLE_CHARS_REGEX = /[\uFFFC\uFFFD\u200B\u200C\u200D\u2060\uFEFF\u200A]/g;

// Time gap threshold for message grouping (30 minutes)
const DEFAULT_TIME_GAP_MS = 30 * 60 * 1000;

// ============================================================
// Text processing
// ============================================================

/**
 * Clean message text by removing invisible characters
 */
export const cleanMessageText = (text) => {
  if (!text) return '';
  return text.replace(INVISIBLE_CHARS_REGEX, '').trim();
};

/**
 * Check if text has visible content after cleaning
 */
export const hasVisibleText = (text) => 
  cleanMessageText(text).length > 0;

// ============================================================
// Attachment processing
// ============================================================

/**
 * Filter attachments to only displayable ones (exclude link previews, missing files)
 */
export const getDisplayableAttachments = (attachments) => {
  if (!attachments) return [];
  return attachments.filter(a => a.type !== 'link_preview' && a.url);
};

/**
 * Extract media (images/videos) from messages
 */
export const extractMedia = (messages) =>
  messages.flatMap(m =>
    (m.attachments || [])
      .filter(a => (a.type === 'image' || a.type === 'video') && a.url)
      .map(a => ({ ...a, date: m.date, messageId: m.id }))
  );

/**
 * Extract unique links from messages, sorted by date descending
 */
export const extractLinks = (messages) => {
  const seen = new Set();
  const links = [];
  
  messages.forEach(m => {
    (m.links || []).forEach(url => {
      if (!seen.has(url)) {
        seen.add(url);
        links.push({ url, date: m.date, messageId: m.id, is_from_me: m.is_from_me });
      }
    });
  });
  
  return links.sort((a, b) => b.date - a.date);
};

// ============================================================
// Message grouping
// ============================================================

/**
 * Detect if conversation is a group chat
 */
export const detectGroupChat = (messages) => {
  const uniqueSenders = new Set(
    messages.map(m => m.sender_name).filter(s => s && s !== 'You')
  );
  const identifier = messages[0]?.contact_identifier || '';
  return uniqueSenders.size > 1 || identifier.includes(',');
};

/**
 * Group consecutive messages from the same sender
 * Returns array of { type: 'messages' | 'time', ... }
 */
export const groupMessages = (messages, timeGapMs = DEFAULT_TIME_GAP_MS) => {
  const groups = [];
  let currentGroup = null;
  let lastTimestamp = null;
  
  messages.forEach(message => {
    const senderId = message.is_from_me 
      ? '__me__' 
      : (message.sender_name || message.handle_id || 'other');
    const timestamp = message.date;
    
    const needsTimeDivider = lastTimestamp && (timestamp - lastTimestamp > timeGapMs);
    const continuesGroup = currentGroup && 
                          currentGroup.senderId === senderId && 
                          !needsTimeDivider;
    
    if (needsTimeDivider) {
      groups.push({ type: 'time', date: timestamp });
    }
    
    if (continuesGroup) {
      currentGroup.messages.push(message);
    } else {
      currentGroup = {
        type: 'messages',
        senderId,
        senderName: message.is_from_me ? null : message.sender_name,
        messages: [message]
      };
      groups.push(currentGroup);
    }
    
    lastTimestamp = timestamp;
  });
  
  return groups;
};
