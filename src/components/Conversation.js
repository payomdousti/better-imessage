import React, { memo, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Tab, TabList } from './ui/Tabs';
import { MessagesList } from './messages/MessagesList';
import { MediaGrid } from './media/MediaGrid';
import { MediaGallery } from './media/MediaGallery';
import { LinksList } from './links/LinksList';
import { MediaGridSkeleton, LinksListSkeleton } from './ui/Skeleton';
import { getConversationMedia, getConversationLinks } from '../api';
import { extractMedia, detectGroupChat } from '../utils/messages';

/**
 * Conversation header component
 */
const ConversationHeader = memo(function ConversationHeader({ 
  displayName, 
  identifier, 
  isGroupChat, 
  memberNames, 
  messageCount, 
  onExport 
}) {
  const showIdentifier = !isGroupChat && displayName !== identifier;

  return (
    <div className="flex-shrink-0 px-4 py-3 border-b bg-background flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isGroupChat && (
            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          <h2 className="text-sm font-medium text-foreground truncate">{displayName}</h2>
        </div>
        {isGroupChat && memberNames.length > 0 && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {memberNames.slice(0, 5).join(', ')}{memberNames.length > 5 ? ` +${memberNames.length - 5}` : ''}
          </p>
        )}
        {showIdentifier && <p className="text-xs text-muted-foreground truncate">{identifier}</p>}
        <p className="text-xs text-muted-foreground">{messageCount.toLocaleString()} messages</p>
      </div>
      <button onClick={onExport} className="btn btn-outline h-8 px-3 text-xs flex-shrink-0">
        Export
      </button>
    </div>
  );
});

/**
 * Empty state component
 */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center px-4 bg-muted/20">
      <svg className="h-16 w-16 text-muted-foreground/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <h3 className="text-lg font-medium text-foreground mb-1">No conversation selected</h3>
      <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
    </div>
  );
});

/**
 * Inactive message input bar (visual only, matches iMessage style)
 */
const InactiveInputBar = memo(function InactiveInputBar() {
  return (
    <div className="flex-shrink-0 px-3 py-2 bg-background border-t border-border/50">
      <div className="flex items-center gap-2">
        <button 
          className="w-8 h-8 rounded-full border border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 cursor-default"
          disabled
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        <div className="flex-1 flex items-center h-9 px-4 rounded-full border border-muted-foreground/30 bg-transparent">
          <span className="text-sm text-muted-foreground/50">iMessage</span>
          <div className="ml-auto flex items-center gap-1">
            <svg className="w-5 h-5 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        </div>
        
        <button 
          className="w-8 h-8 flex items-center justify-center text-muted-foreground/40 cursor-default"
          disabled
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

/**
 * Main Conversation component
 */
function Conversation({ data, chatIds, highlightedMessageId, conversationMeta, onLoadMore, onLoadNewer, loadingMore, loadingNewer }) {
  const [activeTab, setActiveTab] = useState('messages');
  const [galleryIndex, setGalleryIndex] = useState(null);
  const [localHighlightedId, setLocalHighlightedId] = useState(null);
  const [conversationMedia, setConversationMedia] = useState([]);
  const [conversationLinks, setConversationLinks] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  
  const highlightedRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const conversationIdRef = useRef(null);
  const scrollStateRef = useRef({ height: 0, top: 0, direction: null });

  // Extract messages and metadata from data
  const messages = data?.messages || [];
  const totalMessages = data?.total || messages.length;
  const mediaCount = data?.mediaCount || 0;
  const linkCount = data?.linkCount || 0;
  const hasMore = data?.hasMore || false;
  const hasMoreNewer = data?.hasMoreNewer || false;

  const effectiveHighlightedId = localHighlightedId || highlightedMessageId;
  const chatIdString = chatIds ? (Array.isArray(chatIds) ? chatIds.join(',') : chatIds) : null;

  // Derive conversation metadata
  const { displayName, identifier, isGroupChat, memberNames } = useMemo(() => {
    const first = messages[0];
    const id = first?.contact_identifier || 'Unknown';
    
    if (conversationMeta) {
      const isGroup = conversationMeta.isGroup || detectGroupChat(messages);
      const members = conversationMeta.memberNames?.length > 0
        ? conversationMeta.memberNames
        : [...new Set(messages.map(m => m.sender_name).filter(s => s && s !== 'You'))];
      
      return {
        displayName: conversationMeta.displayName || first?.display_name || id,
        identifier: id,
        isGroupChat: isGroup,
        memberNames: members
      };
    }
    
    const isGroup = detectGroupChat(messages);
    const members = isGroup 
      ? [...new Set(messages.map(m => m.sender_name).filter(s => s && s !== 'You'))]
      : [];
    
    return {
      displayName: first?.display_name || id,
      identifier: id,
      isGroupChat: isGroup,
      memberNames: members
    };
  }, [messages, conversationMeta]);

  // Extract media from current messages for inline gallery
  const inlineMedia = useMemo(() => extractMedia(messages), [messages]);

  // Eagerly prefetch media and links when conversation loads
  useEffect(() => {
    if (!chatIdString) return;
    
    // Start prefetching after a short delay (don't block initial render)
    const timer = setTimeout(() => {
      if (conversationMedia.length === 0) {
        getConversationMedia(chatIdString)
          .then(res => setConversationMedia(res.media || []))
          .catch(() => {});
      }
      if (conversationLinks.length === 0) {
        getConversationLinks(chatIdString)
          .then(res => setConversationLinks(res.links || []))
          .catch(() => {});
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [chatIdString]); // Only on conversation change

  // Show loading state if tab is active but data not yet loaded
  useEffect(() => {
    if (activeTab === 'media' && conversationMedia.length === 0 && chatIdString) {
      setMediaLoading(true);
    } else {
      setMediaLoading(false);
    }
  }, [activeTab, conversationMedia.length, chatIdString]);

  useEffect(() => {
    if (activeTab === 'links' && conversationLinks.length === 0 && chatIdString) {
      setLinksLoading(true);
    } else {
      setLinksLoading(false);
    }
  }, [activeTab, conversationLinks.length, chatIdString]);

  // Clear local highlight when external highlight changes
  useEffect(() => {
    setLocalHighlightedId(null);
  }, [highlightedMessageId]);

  // Reset state on conversation change
  useEffect(() => {
    if (identifier !== conversationIdRef.current) {
      conversationIdRef.current = identifier;
      setActiveTab('messages');
      setGalleryIndex(null);
      setLocalHighlightedId(null);
      setConversationMedia([]);
      setConversationLinks([]);
    }
  }, [identifier]);

  // Scroll to highlighted message or bottom on mount/change
  useLayoutEffect(() => {
    if (activeTab !== 'messages' || !messages.length) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;

    // Use a small delay to ensure the DOM has rendered the highlighted message
    const scrollToTarget = () => {
      if (effectiveHighlightedId) {
        // Try to find the highlighted element by ID if ref isn't set
        const targetElement = highlightedRef.current || 
          container.querySelector(`[data-message-id="${effectiveHighlightedId}"]`);
        
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'instant', block: 'center' });
          return;
        }
      }
      // Fallback: scroll to bottom
      container.scrollTop = container.scrollHeight;
    };

    // Double RAF to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTarget);
    });
  }, [effectiveHighlightedId, activeTab, messages.length]);

  // Preserve scroll position after loading messages
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    const { direction, height, top } = scrollStateRef.current;
    if (!container || !direction) return;
    
    if (direction === 'older') {
      // Older messages prepended - adjust scroll to maintain view
      const scrollDiff = container.scrollHeight - height;
      if (scrollDiff > 0) container.scrollTop = scrollDiff;
    } else {
      // Newer messages appended - restore scroll position
      container.scrollTop = top;
    }
    
    scrollStateRef.current.direction = null;
  }, [messages.length]);

  // Bidirectional infinite scroll
  useEffect(() => {
    if (activeTab !== 'messages') return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (loadingMore || loadingNewer) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Near top → load older
      if (scrollTop < 200 && hasMore && onLoadMore) {
        scrollStateRef.current = { height: scrollHeight, top: scrollTop, direction: 'older' };
        onLoadMore();
      }
      // Near bottom → load newer  
      else if (distanceFromBottom < 200 && hasMoreNewer && onLoadNewer) {
        scrollStateRef.current = { height: scrollHeight, top: scrollTop, direction: 'newer' };
        onLoadNewer();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab, hasMore, hasMoreNewer, loadingMore, loadingNewer, onLoadMore, onLoadNewer]);

  // Handlers
  const handleMediaClick = useCallback((messageId, attachmentId) => {
    const idx = inlineMedia.findIndex(m => m.id === attachmentId);
    if (idx !== -1) setGalleryIndex(idx);
  }, [inlineMedia]);

  const handleGoToMessageFromMedia = useCallback((messageId) => {
    setActiveTab('messages');
    setLocalHighlightedId(messageId);
  }, []);

  const handleExport = useCallback(() => {
    const text = messages.map(m => {
      let line = `${m.is_from_me ? 'You' : displayName}: ${m.text || ''}`;
      if (m.attachments?.length) line += ` [${m.attachments.length} attachments]`;
      return line;
    }).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${displayName.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, displayName]);

  const handleGalleryClose = useCallback(() => setGalleryIndex(null), []);

  if (!messages.length && !data) return <EmptyState />;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-muted/20 overflow-hidden">
      <ConversationHeader
        displayName={displayName}
        identifier={identifier}
        isGroupChat={isGroupChat}
        memberNames={memberNames}
        messageCount={totalMessages}
        onExport={handleExport}
      />

      <TabList className="flex-shrink-0 bg-background">
        <Tab active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>
          Messages
        </Tab>
        <Tab active={activeTab === 'media'} onClick={() => setActiveTab('media')} count={mediaCount}>
          Media
        </Tab>
        <Tab active={activeTab === 'links'} onClick={() => setActiveTab('links')} count={linkCount}>
          Links
        </Tab>
      </TabList>

      {activeTab === 'messages' && (
        <>
          <MessagesList
            messages={messages}
            isGroupChat={isGroupChat}
            displayName={displayName}
            highlightedId={effectiveHighlightedId}
            highlightedRef={highlightedRef}
            containerRef={messagesContainerRef}
            onMediaClick={handleMediaClick}
            loadingMore={loadingMore}
            loadingNewer={loadingNewer}
            hasMore={hasMore}
            hasMoreNewer={hasMoreNewer}
          />
          <InactiveInputBar />
        </>
      )}
      {activeTab === 'media' && (
        mediaLoading ? (
          <div className="flex-1 overflow-hidden p-1">
            <MediaGridSkeleton count={12} />
          </div>
        ) : (
          <div className="fade-in flex-1 flex flex-col overflow-hidden">
            <MediaGrid 
              media={conversationMedia} 
              onGoToMessage={handleGoToMessageFromMedia} 
            />
          </div>
        )
      )}
      {activeTab === 'links' && (
        linksLoading ? (
          <LinksListSkeleton count={4} />
        ) : (
          <div className="fade-in flex-1 overflow-hidden">
            <LinksList links={conversationLinks} />
          </div>
        )
      )}

      {galleryIndex !== null && activeTab === 'messages' && (
        <MediaGallery
          media={inlineMedia}
          currentIndex={galleryIndex}
          onClose={handleGalleryClose}
          onNavigate={setGalleryIndex}
        />
      )}
    </div>
  );
}

export default memo(Conversation);
