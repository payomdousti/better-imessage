import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import Conversation from './Conversation';
import ContactFilter from './ContactFilter';
import Insights from './Insights';
import { Tab, TabList } from './ui/Tabs';
import { Avatar } from './ui/Avatar';
import { SortToggle } from './ui/SortToggle';
import { MediaGallery } from './media/MediaGallery';
import { LinkPreview } from './links/LinkPreview';
import { ConversationListSkeleton, ConversationSkeleton2, MediaGridSkeleton, LinksListSkeleton } from './ui/Skeleton';
import { useConversationCache } from '../hooks/useConversationCache';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { searchMessages, getContacts, getConversations, getGlobalMedia, getGlobalLinks } from '../api';
import { formatRelativeTime } from '../utils/format';
import '../App.css';

// Constants
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 320;
const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// ConversationItem - Single conversation in the sidebar list
// ─────────────────────────────────────────────────────────────────────────────
const ConversationItem = memo(function ConversationItem({ conversation, onClick, isActive, onHover }) {
  return (
    <li
      onClick={() => onClick(conversation)}
      onMouseEnter={() => onHover?.(conversation)}
      className={`conversation-item px-3 py-3 cursor-pointer my-1 flex items-center gap-3 ${isActive ? 'active' : ''}`}
    >
      <Avatar name={conversation.display_name} isGroup={conversation.is_group} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-sm font-medium text-foreground truncate">
            {conversation.display_name}
          </span>
          <span className="text-xs text-muted-foreground/60 flex-shrink-0 ml-2">
            {formatRelativeTime(conversation.last_message_date)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {conversation.last_message || 'No messages'}
        </p>
      </div>
    </li>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MediaThumbnail - Single media item in global media grid
// ─────────────────────────────────────────────────────────────────────────────
const MediaThumbnail = memo(function MediaThumbnail({ item, onClick }) {
  return (
    <div
      className="aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer relative"
      onClick={onClick}
    >
      {item.type === 'video' ? (
        <>
          {item.thumbUrl ? (
            <img src={item.thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-muted-foreground/20" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <svg className="h-6 w-6 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </>
      ) : (
        <img src={item.thumbUrl || item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GlobalMediaGrid - Grid of all media across conversations
// ─────────────────────────────────────────────────────────────────────────────
const GlobalMediaGrid = memo(function GlobalMediaGrid({ onGoToMessage, selectedContacts = [] }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  
  const contactsKey = useMemo(() => selectedContacts.join(','), [selectedContacts]);

  useEffect(() => {
    setLoading(true);
    setMedia([]);
    getGlobalMedia(200, 0, sortOrder, selectedContacts).then(data => {
      setMedia(data.media);
      setHasMore(data.hasMore);
      setLoading(false);
    });
  }, [sortOrder, contactsKey]);

  const loadMore = useCallback(() => {
    return getGlobalMedia(200, media.length, sortOrder, selectedContacts).then(data => {
      setMedia(prev => [...prev, ...data.media]);
      setHasMore(data.hasMore);
    });
  }, [media.length, sortOrder, selectedContacts]);

  const { loaderRef, loadingMore } = useInfiniteScroll(loadMore, { hasMore, loading });

  const handleGoToMessage = useCallback((item) => {
    setGalleryIndex(null);
    if (onGoToMessage && item.chat_id && item.message_id) {
      onGoToMessage(item.chat_id, item.message_id);
    }
  }, [onGoToMessage]);

  return (
    <>
      <div className="flex-shrink-0 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {loading ? '' : `${media.length} items`}
        </span>
        <SortToggle sortOrder={sortOrder} onToggle={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} />
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
        {loading ? (
          <MediaGridSkeleton count={24} />
        ) : (
          <div className="grid grid-cols-6 gap-0.5 fade-in">
            {media.map((item, idx) => (
              <MediaThumbnail
                key={item.id}
                item={item}
                onClick={() => setGalleryIndex(idx)}
              />
            ))}
          </div>
        )}
        <div ref={loaderRef} className="h-20 flex items-center justify-center">
          {loadingMore && (
            <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
          )}
        </div>
      </div>
      
      {galleryIndex !== null && (
        <MediaGallery
          media={media}
          currentIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onNavigate={setGalleryIndex}
          onGoToMessage={handleGoToMessage}
        />
      )}
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GlobalLinksList - List of all links across conversations
// ─────────────────────────────────────────────────────────────────────────────
const GlobalLinksList = memo(function GlobalLinksList({ selectedContacts = [] }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const contactsKey = useMemo(() => selectedContacts.join(','), [selectedContacts]);

  useEffect(() => {
    setLoading(true);
    setLinks([]);
    getGlobalLinks(50, 0, selectedContacts).then(data => {
      setLinks(data.links);
      setHasMore(data.hasMore);
      setLoading(false);
    });
  }, [contactsKey]);

  const loadMore = useCallback(() => {
    return getGlobalLinks(50, links.length, selectedContacts).then(data => {
      setLinks(prev => [...prev, ...data.links]);
      setHasMore(data.hasMore);
    });
  }, [links.length, selectedContacts]);

  const { loaderRef, loadingMore } = useInfiniteScroll(loadMore, { hasMore, loading });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
      {loading ? (
        <LinksListSkeleton count={6} />
      ) : (
        <div className="space-y-3 fade-in">
          {links.map((link, idx) => (
            <div key={`${link.url}-${idx}`}>
              <LinkPreview url={link.url} />
              <p className="text-xs text-muted-foreground mt-1 px-1">
                {link.is_from_me ? 'You' : link.contact} · {new Date(link.date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
      <div ref={loaderRef} className="h-10 flex items-center justify-center">
        {loadingMore && (
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ProcessingStatus - Shows media processing progress
// ─────────────────────────────────────────────────────────────────────────────
const ProcessingStatus = memo(function ProcessingStatus() {
  const [status, setStatus] = useState(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    const checkStatus = async () => {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        if (!mounted) return;
        
        setStatus(data);
        if (data.ready || data.total === 0 || data.remaining === 0) {
          setTimeout(() => mounted && setVisible(false), 1500);
        } else {
          setVisible(true);
          setTimeout(checkStatus, 1000);
        }
      } catch (e) { /* ignore */ }
    };
    
    checkStatus();
    return () => { mounted = false; };
  }, []);
  
  if (!visible || !status || status.total === 0) return null;
  
  const pct = Math.round((status.processed / status.total) * 100);
  const isDone = status.ready || status.remaining === 0;
  
  return (
    <div className={`fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-3 text-sm z-50 transition-opacity duration-500 ${isDone ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex items-center gap-2 mb-1">
        {isDone ? (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
        <span className="text-foreground">{isDone ? 'Complete!' : 'Processing...'}</span>
      </div>
      <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">{status.processed} / {status.total}</div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ConversationsList - Sidebar list of conversations
// ─────────────────────────────────────────────────────────────────────────────
const ConversationsList = memo(function ConversationsList({ 
  conversations, 
  onConversationClick, 
  onConversationHover,
  activeConversationId, 
  selectedContacts,
  loading
}) {
  const filteredConversations = useMemo(() => {
    if (selectedContacts.length === 0) return conversations;
    return conversations.filter(c => selectedContacts.includes(c.contact_id));
  }, [conversations, selectedContacts]);

  // Show skeleton while loading
  if (loading) {
    return <ConversationListSkeleton count={10} />;
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-sm text-muted-foreground">
          {selectedContacts.length > 0 ? 'No matching conversations' : 'No conversations'}
        </p>
      </div>
    );
  }

  return (
    <ul className="fade-in">
      {filteredConversations.map(conv => (
        <ConversationItem
          key={conv.contact_id}
          conversation={conv}
          onClick={onConversationClick}
          onHover={onConversationHover}
          isActive={conv.chat_ids.includes(activeConversationId)}
        />
      ))}
    </ul>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  // Core state
  const [activeTab, setActiveTab] = useState('messages');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Conversation state - stores full API response with pagination metadata
  const [conversationData, setConversationData] = useState(null);
  const [conversationMeta, setConversationMeta] = useState(null);
  const [activeChatIds, setActiveChatIds] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  
  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const { loadConversation, loadMore, loadNewer, prefetch } = useConversationCache();
  
  // Sidebar resize handlers
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e) => {
      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => setIsResizing(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Initial data load
  useEffect(() => {
    getContacts().then(setContacts);
    getConversations().then(data => {
      setConversations(data);
      setConversationsLoading(false);
    });
  }, []);

  // Search handler
  const handleSearch = useCallback(async (searchQuery) => {
    setQuery(searchQuery);
    setPage(1);
    
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      getConversations().then(setConversations);
      return;
    }
    
    setConversationData(null);
    setActiveChatIds(null);
    setHighlightedId(null);
    setActiveConversationId(null);
    const data = await searchMessages(searchQuery, 1, selectedContacts);
    setResults(data.results);
    setTotalResults(data.total || data.results.length);
    // Use total count from API if available, otherwise fall back to checking page size
    setHasMore(data.total ? data.results.length < data.total : data.results.length === PAGE_SIZE);
  }, [selectedContacts]);

  // Load more search results
  const loadMoreResults = useCallback(async () => {
    const nextPage = page + 1;
    const data = await searchMessages(query, nextPage, selectedContacts);
    const newResults = [...results, ...data.results];
    setResults(newResults);
    setPage(nextPage);
    // Use total count from API if available
    setHasMore(data.total ? newResults.length < data.total : data.results.length === PAGE_SIZE);
  }, [query, page, selectedContacts, results]);

  // Unified conversation opener - works for both sidebar and search results
  const openConversation = useCallback(async (chatIds, options = {}) => {
    const { targetMessageId, meta } = options;
    const ids = Array.isArray(chatIds) ? chatIds : [chatIds];
    
    setActiveConversationId(ids[0]);
    setActiveChatIds(ids);
    setHighlightedId(targetMessageId || null);
    setConversationMeta(meta || null);
    setConversationLoading(true);
    
    // Load around target message if specified, otherwise load most recent
    const { data } = await loadConversation(ids, targetMessageId ? { around: targetMessageId } : {});
    setConversationData(data);
    setConversationLoading(false);
  }, [loadConversation]);

  // Open conversation from search result
  const handleResultClick = useCallback((conversationId, messageId) => {
    openConversation(conversationId, { targetMessageId: messageId });
  }, [openConversation]);

  // Open conversation from sidebar
  const handleConversationClick = useCallback((conv) => {
    openConversation(conv.chat_ids, {
      meta: {
        displayName: conv.display_name,
        isGroup: conv.is_group,
        memberNames: conv.member_names || []
      }
    });
  }, [openConversation]);

  // Navigate to message from media gallery
  const handleGoToMessage = useCallback(async (chatId, messageId) => {
    setActiveTab('messages');
    setActiveConversationId(chatId);
    setActiveChatIds([chatId]);
    setHighlightedId(messageId);
    setConversationMeta(null);
    setConversationLoading(true);
    const { data } = await loadConversation(chatId);
    setConversationData(data);
    setConversationLoading(false);
  }, [loadConversation]);

  // Unified message loading - direction: 'older' or 'newer'
  const handleLoadMessages = useCallback(async (direction) => {
    if (!activeChatIds || loadingMore || loadingNewer) return;
    
    const pivotId = direction === 'older' ? conversationData?.oldestId : conversationData?.newestId;
    if (!pivotId) return;

    const setLoading = direction === 'older' ? setLoadingMore : setLoadingNewer;
    const loadFn = direction === 'older' ? loadMore : loadNewer;
    
    setLoading(true);
    const { data } = await loadFn(activeChatIds, pivotId);
    setConversationData(data);
    setLoading(false);
  }, [activeChatIds, conversationData, loadingMore, loadingNewer, loadMore, loadNewer]);

  const handleLoadMoreMessages = useCallback(() => handleLoadMessages('older'), [handleLoadMessages]);
  const handleLoadNewerMessages = useCallback(() => handleLoadMessages('newer'), [handleLoadMessages]);

  // Prefetch conversation on hover (eager loading)
  const handleConversationHover = useCallback((conv) => {
    prefetch(conv.chat_ids);
  }, [prefetch]);

  // Auto-load first conversation on initial render
  useEffect(() => {
    if (initialLoaded || query.trim() || !conversations.length) return;
    setInitialLoaded(true);
    handleConversationClick(conversations[0]);
  }, [conversations, query, initialLoaded, handleConversationClick]);

  // Handle contact filter changes
  const handleContactFilterChange = useCallback(async (newSelection) => {
    setSelectedContacts(newSelection);
    if (query) {
      setPage(1);
      const data = await searchMessages(query, 1, newSelection);
      setResults(data.results);
      setTotalResults(data.total || data.results.length);
      // Use total count from API if available
      setHasMore(data.total ? data.results.length < data.total : data.results.length === PAGE_SIZE);
    }
  }, [query]);

  const showConversationsList = !query.trim() && results.length === 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-card/50 border-b">
        <div className="px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <ContactFilter
            contacts={contacts}
            selectedContacts={selectedContacts}
            onSelectionChange={handleContactFilterChange}
          />
        </div>
        <TabList className="px-4">
          <Tab active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>Messages</Tab>
          <Tab active={activeTab === 'media'} onClick={() => setActiveTab('media')}>Media</Tab>
          <Tab active={activeTab === 'links'} onClick={() => setActiveTab('links')}>Links</Tab>
          <Tab active={activeTab === 'insights'} onClick={() => setActiveTab('insights')}>Insights</Tab>
        </TabList>
      </header>

      {/* Content */}
      {activeTab === 'messages' ? (
        <main className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <aside 
            className={`flex-shrink-0 border-r border-border/50 bg-card/30 flex flex-col relative ${sidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : ''}`}
            style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          >
            <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
              <button
                onClick={() => setSidebarCollapsed(prev => !prev)}
                className="p-1 rounded hover:bg-accent transition-colors flex-shrink-0"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg 
                  className={`w-4 h-4 text-muted-foreground ${sidebarCollapsed ? '' : 'rotate-180'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate">{showConversationsList ? 'Conversations' : 'Results'}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {showConversationsList 
                    ? (conversationsLoading ? '' : conversations.length)
                    : totalResults}
                </span>
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {showConversationsList ? (
                <ConversationsList
                  conversations={conversations}
                  onConversationClick={handleConversationClick}
                  onConversationHover={handleConversationHover}
                  activeConversationId={activeConversationId}
                  selectedContacts={selectedContacts}
                  loading={conversationsLoading}
                />
              ) : (
                <SearchResults
                  results={results}
                  onResultClick={handleResultClick}
                  loadMore={loadMoreResults}
                  hasMore={hasMore}
                  inline
                />
              )}
            </div>
            
            {/* Resize handle */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors ${isResizing ? 'bg-primary/50' : ''}`}
              />
            )}
          </aside>
          
          {/* Collapsed sidebar expand button */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="flex-shrink-0 w-6 bg-card/50 border-r border-border/50 flex items-center justify-center hover:bg-accent transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {conversationLoading ? (
            <ConversationSkeleton2 />
          ) : (
            <Conversation
              data={conversationData}
              chatIds={activeChatIds}
              highlightedMessageId={highlightedId}
              conversationMeta={conversationMeta}
              onLoadMore={handleLoadMoreMessages}
              onLoadNewer={handleLoadNewerMessages}
              loadingMore={loadingMore}
              loadingNewer={loadingNewer}
            />
          )}
        </main>
      ) : activeTab === 'media' ? (
        <main className="flex-1 flex flex-col min-h-0 bg-muted/20">
          <GlobalMediaGrid onGoToMessage={handleGoToMessage} selectedContacts={selectedContacts} />
        </main>
      ) : activeTab === 'links' ? (
        <main className="flex-1 flex flex-col min-h-0 bg-muted/20">
          <GlobalLinksList selectedContacts={selectedContacts} />
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-h-0">
          <Insights />
        </main>
      )}
      
      <ProcessingStatus />
    </div>
  );
}

export default App;
