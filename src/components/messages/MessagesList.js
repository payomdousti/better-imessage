import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { MessageGroup } from './MessageGroup';
import { TimeDivider } from './TimeDivider';
import { groupMessages } from '../../utils/messages';

/**
 * Scroll-to-bottom button component.
 * Uses CSS for show/hide animation, no state updates during scroll.
 */
const ScrollToBottomButton = memo(function ScrollToBottomButton({ containerRef }) {
  const buttonRef = useRef(null);
  
  // Track scroll position via DOM, not React state
  useEffect(() => {
    const container = containerRef?.current;
    const button = buttonRef.current;
    if (!container || !button) return;
    
    const updateButtonVisibility = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const shouldShow = distanceFromBottom > 200;
      button.dataset.visible = shouldShow ? 'true' : 'false';
    };
    
    updateButtonVisibility();
    container.addEventListener('scroll', updateButtonVisibility, { passive: true });
    return () => container.removeEventListener('scroll', updateButtonVisibility);
  }, [containerRef]);
  
  const handleClick = useCallback(() => {
    const container = containerRef?.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [containerRef]);
  
  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      data-visible="false"
      className="scroll-to-bottom-btn"
      aria-label="Scroll to bottom"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  );
});

/**
 * Loading indicator for infinite scroll
 */
const LoadingIndicator = memo(function LoadingIndicator() {
  return (
    <div className="py-4 flex justify-center">
      <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
    </div>
  );
});

/**
 * MessagesList component - renders grouped messages with time dividers.
 * Uses CSS content-visibility for performance instead of JS virtualization.
 */
export const MessagesList = memo(function MessagesList({ 
  messages, 
  isGroupChat, 
  displayName, 
  highlightedId, 
  highlightedRef, 
  containerRef, 
  onMediaClick,
  loadingMore,
  loadingNewer,
  hasMore,
  hasMoreNewer
}) {
  // Group messages by sender and time - memoized
  const messageGroups = useMemo(() => groupMessages(messages), [messages]);

  // Get sender name for a group
  const getSenderName = useCallback((group) => {
    return group.senderName || (!group.messages[0]?.is_from_me ? displayName : null);
  }, [displayName]);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-thin px-3 py-2"
      >
        {/* Loading indicator at top when loading more */}
        {loadingMore && <LoadingIndicator />}
        
        {/* "Beginning of conversation" indicator */}
        {!hasMore && !loadingMore && messages.length > 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground/50">
            Beginning of conversation
          </div>
        )}
        
        <div className="message-groups">
          {messageGroups.map((group, idx) => {
            if (group.type === 'time') {
              return <TimeDivider key={`time-${idx}`} date={group.date} />;
            }
            
            return (
              <MessageGroup
                key={`group-${idx}-${group.messages[0]?.id}`}
                messages={group.messages}
                senderName={getSenderName(group)}
                isGroupChat={isGroupChat}
                highlightedId={highlightedId}
                highlightedRef={highlightedRef}
                onMediaClick={onMediaClick}
              />
            );
          })}
        </div>
        
        {/* Loading indicator at bottom when loading newer */}
        {loadingNewer && <LoadingIndicator />}
        
        {/* "End of conversation" indicator */}
        {!hasMoreNewer && !loadingNewer && messages.length > 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground/50">
            End of conversation
          </div>
        )}
      </div>
      
      <ScrollToBottomButton containerRef={containerRef} />
    </div>
  );
});

export default MessagesList;
