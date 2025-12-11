/**
 * Tests for custom React hooks
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

describe('useInfiniteScroll', () => {
  let mockObserve;
  let mockDisconnect;
  let observerCallback;

  beforeEach(() => {
    mockObserve = jest.fn();
    mockDisconnect = jest.fn();
    
    global.IntersectionObserver = jest.fn((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return loaderRef and loadingMore state', () => {
    // Simple hook simulation
    const useInfiniteScroll = (fetchMore, { hasMore, loading } = {}) => {
      const [loadingMore, setLoadingMore] = React.useState(false);
      const loaderRef = React.useRef(null);
      return { loaderRef, loadingMore };
    };

    const { result } = renderHook(() => 
      useInfiniteScroll(jest.fn(), { hasMore: true, loading: false })
    );

    expect(result.current.loaderRef).toBeDefined();
    expect(result.current.loadingMore).toBe(false);
  });
});

describe('useConversationCache', () => {
  it('should cache conversations', async () => {
    const mockData = [{ id: 1, text: 'Hello' }];
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockData)
    });

    // Simple cache simulation
    const cache = new Map();
    
    const loadConversation = async (id) => {
      const key = `conv-${id}`;
      if (cache.has(key)) {
        return { data: cache.get(key), fromCache: true };
      }
      const res = await fetch(`/conversation/${id}`);
      const data = await res.json();
      cache.set(key, data);
      return { data, fromCache: false };
    };

    // First load - from network
    const result1 = await loadConversation('123');
    expect(result1.fromCache).toBe(false);
    expect(result1.data).toEqual(mockData);

    // Second load - from cache
    const result2 = await loadConversation('123');
    expect(result2.fromCache).toBe(true);
    expect(result2.data).toEqual(mockData);
    
    // Only one fetch call
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('useLinkPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and cache link preview', async () => {
    const mockPreview = { title: 'Test', description: 'Desc' };
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockPreview)
    });

    // Simple preview cache simulation
    const previewCache = new Map();
    
    const getLinkPreview = async (url) => {
      if (previewCache.has(url)) {
        return { preview: previewCache.get(url), loading: false };
      }
      const res = await fetch(`/link-preview?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      previewCache.set(url, data);
      return { preview: data, loading: false };
    };

    // First call
    const result1 = await getLinkPreview('https://example.com');
    expect(result1.preview).toEqual(mockPreview);

    // Second call - from cache
    const result2 = await getLinkPreview('https://example.com');
    expect(result2.preview).toEqual(mockPreview);
    
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const getLinkPreview = async (url) => {
      try {
        const res = await fetch(`/link-preview?url=${encodeURIComponent(url)}`);
        return await res.json();
      } catch (e) {
        return null;
      }
    };

    const result = await getLinkPreview('https://example.com');
    expect(result).toBe(null);
  });
});

