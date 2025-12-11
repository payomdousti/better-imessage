/**
 * SearchResults component
 * @module components/SearchResults
 */

import React, { useRef, useCallback, memo, useMemo } from 'react';
import { formatRelativeTime } from '../utils/format';

// ============================================================
// Sub-components
// ============================================================

/**
 * Single search result item
 */
const SearchResult = memo(({ result, onResultClick, innerRef }) => {
  const handleClick = useCallback(
    () => onResultClick(result.conversation_id, result.message_id),
    [onResultClick, result.conversation_id, result.message_id]
  );
  
  const displayName = result.display_name || result.contact_identifier;
  const showIdentifier = result.display_name && result.display_name !== result.contact_identifier;
  const formattedTime = useMemo(() => formatRelativeTime(result.date), [result.date]);
  
  return (
    <li
      ref={innerRef}
      onClick={handleClick}
      className="group px-4 py-3 cursor-pointer border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors duration-100"
      style={{ contain: 'content' }}
    >
      <p className="text-sm text-foreground line-clamp-2 mb-1.5">{result.text}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground truncate block">
            {displayName}
          </span>
          {showIdentifier && (
            <span className="text-[10px] text-muted-foreground/70 truncate block">
              {result.contact_identifier}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground/70 flex-shrink-0">
          {formattedTime}
        </span>
      </div>
    </li>
  );
});

/**
 * Empty state display
 */
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    <svg
      className="h-12 w-12 text-muted-foreground/40 mb-3"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
    <p className="text-sm text-muted-foreground">
      Search for messages to get started
    </p>
  </div>
));

// ============================================================
// Main component
// ============================================================

/**
 * SearchResults - Displays search results with infinite scroll
 */
const SearchResults = ({ results, onResultClick, hasMore, loadMore, inline }) => {
  const observer = useRef();
  
  // Infinite scroll observer
  const lastRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    if (!node || !hasMore) return;
    
    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.current.observe(node);
  }, [hasMore, loadMore]);

  const content = (
    <>
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="auto-virtualize">
          {results.map((result, i) => (
            <SearchResult
              key={result.message_id}
              result={result}
              onResultClick={onResultClick}
              innerRef={i === results.length - 1 ? lastRef : null}
            />
          ))}
        </ul>
      )}
      
      {hasMore && (
        <div className="px-4 py-3 text-center">
          <span className="text-xs text-muted-foreground">Loading more...</span>
        </div>
      )}
    </>
  );

  // Inline mode - just return content without wrapper
  if (inline) {
    return content;
  }

  return (
    <aside className="w-80 flex-shrink-0 border-r bg-background flex flex-col">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-medium text-foreground">
          Results
          {results.length > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({results.length}{hasMore ? '+' : ''})
            </span>
          )}
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {content}
      </div>
    </aside>
  );
};

export default memo(SearchResults);
