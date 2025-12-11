/**
 * API client for iMessage search
 * @module api
 */

const API_BASE = '';

// ============================================================
// API request helpers
// ============================================================

/**
 * Build URL params, filtering out empty arrays
 */
const buildParams = (params) => {
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        urlParams.set(key, value.join(','));
      }
    } else if (value !== undefined && value !== null) {
      urlParams.set(key, String(value));
    }
  });
  
  return urlParams;
};

/**
 * Fetch JSON from API endpoint
 */
const fetchJson = async (endpoint, params = {}) => {
  const urlParams = buildParams(params);
  const url = urlParams.toString() 
    ? `${API_BASE}${endpoint}?${urlParams}`
    : `${API_BASE}${endpoint}`;
  
  const res = await fetch(url);
  return res.json();
};

// ============================================================
// API functions
// ============================================================

/**
 * Search messages
 */
export const searchMessages = (query, page = 1, contacts = []) =>
  fetchJson('/search', { q: query, page, contacts });

/**
 * Get conversation messages by ID(s)
 * Returns: { messages, total, mediaCount, linkCount, hasMore, oldestId, newestId }
 * 
 * Supports pagination:
 * - limit: Number of messages to return (default: 200)
 * - before: Get messages before this message ID
 * - after: Get messages after this message ID
 * - around: Get messages centered around this message ID
 */
export const getConversation = (conversationId, { limit, before, after, around } = {}) =>
  fetchJson(`/conversation/${conversationId}`, { limit, before, after, around });

/**
 * Get all media for a conversation
 * Returns: { media: [...] }
 */
export const getConversationMedia = (conversationId, sort = 'desc') =>
  fetchJson(`/conversation/${conversationId}/media`, { sort });

/**
 * Get all links for a conversation
 * Returns: { links: [...] }
 */
export const getConversationLinks = (conversationId) =>
  fetchJson(`/conversation/${conversationId}/links`);

/**
 * Get all contacts
 */
export const getContacts = () =>
  fetchJson('/contacts');

/**
 * Get all conversations
 */
export const getConversations = (limit = 50) =>
  fetchJson('/conversations', { limit });

/**
 * Get global media
 */
export const getGlobalMedia = (limit = 100, offset = 0, sort = 'desc', contacts = []) =>
  fetchJson('/global/media', { limit, offset, sort, contacts });

/**
 * Get global links
 */
export const getGlobalLinks = (limit = 100, offset = 0, contacts = []) =>
  fetchJson('/global/links', { limit, offset, contacts });
