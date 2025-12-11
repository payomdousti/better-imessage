import { useState, useEffect } from 'react';

// LRU-like cache for link previews with max size
const MAX_CACHE_SIZE = 200;
const previewCache = new Map();

// Evict oldest entries when cache is full
function setCacheEntry(url, data) {
  if (previewCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entry (first key in Map)
    const firstKey = previewCache.keys().next().value;
    previewCache.delete(firstKey);
  }
  previewCache.set(url, data);
}

export function useLinkPreview(url) {
  const [preview, setPreview] = useState(() => previewCache.get(url)?.data || null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [error, setError] = useState(() => previewCache.get(url)?.error || null);

  useEffect(() => {
    const cached = previewCache.get(url);
    if (cached) {
      setPreview(cached.data);
      setError(cached.error);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/link-preview?url=${encodeURIComponent(url)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setCacheEntry(url, { data, error: null });
          setPreview(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const errorMessage = err.message || 'Failed to load preview';
          setCacheEntry(url, { data: null, error: errorMessage });
          setPreview(null);
          setError(errorMessage);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  return { preview, loading, error };
}

export default useLinkPreview;
