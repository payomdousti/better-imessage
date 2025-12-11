/**
 * Infinite scroll hook
 * @module hooks/useInfiniteScroll
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for infinite scroll with IntersectionObserver
 * 
 * @param {Function} fetchMore - Async function to fetch more items
 * @param {Object} options - Configuration options
 * @param {boolean} options.hasMore - Whether more items are available
 * @param {boolean} options.loading - Whether initial load is in progress
 * @param {string} options.rootMargin - IntersectionObserver root margin
 * @returns {{ loaderRef: React.RefObject, loadingMore: boolean }}
 */
export const useInfiniteScroll = (fetchMore, { hasMore, loading, rootMargin = '200px' } = {}) => {
  const loaderRef = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || !hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          Promise.resolve(fetchMore()).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchMore, rootMargin]);

  return { loaderRef, loadingMore };
};

export default useInfiniteScroll;
