/**
 * Conversation cache hook
 * @module hooks/useConversationCache
 * 
 * Caches conversation data with LRU-like behavior.
 * Supports paginated loading for large conversations.
 */

import { useCallback, useRef } from 'react';
import { getConversation } from '../api';

// Maximum number of conversations to cache
const MAX_CACHE_SIZE = 50;

/**
 * Hook for caching and loading conversation data
 * 
 * @returns {{
 *   loadConversation: Function,
 *   loadMore: Function,
 *   get: Function,
 *   set: Function,
 *   has: Function,
 *   clear: Function
 * }}
 */
export const useConversationCache = () => {
  const cache = useRef(new Map());

  /**
   * Get cache key from chat IDs
   */
  const getKey = useCallback((chatIds) => {
    const id = Array.isArray(chatIds) ? chatIds.join(',') : chatIds;
    return `conv-${id}`;
  }, []);

  /**
   * Get item from cache
   */
  const get = useCallback((chatIds) => {
    const key = getKey(chatIds);
    return cache.current.get(key);
  }, [getKey]);

  /**
   * Set item in cache with LRU eviction
   */
  const set = useCallback((chatIds, data) => {
    const key = getKey(chatIds);
    
    // Simple LRU: delete oldest if at capacity
    if (cache.current.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    cache.current.set(key, data);
  }, [getKey]);

  /**
   * Check if key exists in cache
   */
  const has = useCallback((chatIds) => {
    const key = getKey(chatIds);
    return cache.current.has(key);
  }, [getKey]);

  /**
   * Clear cache entry
   */
  const clear = useCallback((chatIds) => {
    const key = getKey(chatIds);
    cache.current.delete(key);
  }, [getKey]);

  /**
   * Load conversation from cache or API
   * 
   * @param {string|number|Array} chatIds - Chat ID(s) to load
   * @param {Object} options - Optional parameters
   * @param {number} options.around - Load messages centered around this message ID
   * @returns {Promise<{ data: Object, fromCache: boolean }>}
   */
  const loadConversation = useCallback(async (chatIds, options = {}) => {
    const { around } = options;
    
    // If loading around a specific message, skip cache (need fresh centered data)
    if (around) {
      const id = Array.isArray(chatIds) ? chatIds.join(',') : chatIds;
      const response = await getConversation(id, { around });
      // Don't cache "around" queries as they're targeted loads
      return { data: response, fromCache: false };
    }
    
    // Check cache first for normal loads
    if (has(chatIds)) {
      return { data: get(chatIds), fromCache: true };
    }

    // Fetch from API
    const id = Array.isArray(chatIds) ? chatIds.join(',') : chatIds;
    const response = await getConversation(id);
    
    // Cache the response
    set(chatIds, response);
    return { data: response, fromCache: false };
  }, [get, set, has]);

  /**
   * Prefetch a conversation without blocking
   * Used for eager loading of likely-needed conversations
   */
  const prefetch = useCallback((chatIds) => {
    if (has(chatIds)) return; // Already cached
    
    const id = Array.isArray(chatIds) ? chatIds.join(',') : chatIds;
    // Fire and forget - don't await
    getConversation(id).then(response => {
      set(chatIds, response);
    }).catch(() => {}); // Ignore errors for prefetch
  }, [has, set]);

  /**
   * Load more messages (older) for a conversation
   * Merges with existing cached data
   * 
   * @param {string|number|Array} chatIds - Chat ID(s)
   * @param {number} beforeId - Load messages before this ID
   * @returns {Promise<{ data: Object, newMessages: Array }>}
   */
  const loadMore = useCallback(async (chatIds, beforeId) => {
    const id = Array.isArray(chatIds) ? chatIds.join(',') : chatIds;
    const response = await getConversation(id, { before: beforeId });
    
    // Merge with existing cached data
    const existing = get(chatIds);
    if (existing && existing.messages) {
      const merged = {
        ...existing,
        messages: [...response.messages, ...existing.messages],
        hasMore: response.hasMore,
        oldestId: response.oldestId || existing.oldestId
      };
      set(chatIds, merged);
      return { data: merged, newMessages: response.messages };
    }
    
    set(chatIds, response);
    return { data: response, newMessages: response.messages };
  }, [get, set]);

  /**
   * Load newer messages for a conversation
   * Merges with existing cached data
   * 
   * @param {string|number|Array} chatIds - Chat ID(s)
   * @param {number} afterId - Load messages after this ID
   * @returns {Promise<{ data: Object, newMessages: Array }>}
   */
  const loadNewer = useCallback(async (chatIds, afterId) => {
    const id = Array.isArray(chatIds) ? chatIds.join(',') : chatIds;
    const response = await getConversation(id, { after: afterId });
    
    // Merge with existing cached data
    const existing = get(chatIds);
    if (existing && existing.messages) {
      const merged = {
        ...existing,
        messages: [...existing.messages, ...response.messages],
        hasMoreNewer: response.hasMore, // Note: hasMore from after query means more newer
        newestId: response.newestId || existing.newestId
      };
      set(chatIds, merged);
      return { data: merged, newMessages: response.messages };
    }
    
    set(chatIds, response);
    return { data: response, newMessages: response.messages };
  }, [get, set]);

  return { loadConversation, loadMore, loadNewer, prefetch, get, set, has, clear };
};

export default useConversationCache;

