import React, { memo, useState, useMemo, useCallback } from 'react';
import { SortToggle } from '../ui/SortToggle';
import { MediaGallery } from './MediaGallery';
import { extractMedia } from '../../utils/messages';

// Single media thumbnail
const MediaThumbnail = memo(function MediaThumbnail({ item, onClick }) {
  return (
    <div
      className="aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer relative"
      onClick={onClick}
    >
      {item.type === 'video' ? (
        <div className="w-full h-full relative">
          {item.thumbUrl ? (
            <img src={item.thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full bg-muted-foreground/20" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <svg className="h-6 w-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      ) : (
        <img src={item.thumbUrl || item.url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
      )}
    </div>
  );
});

/**
 * MediaGrid component
 * 
 * Accepts either:
 * - `media`: Array of media items from API
 * - `messages`: Array of messages to extract media from (legacy)
 */
export const MediaGrid = memo(function MediaGrid({ media: mediaProp, messages, onGoToMessage }) {
  const [galleryIndex, setGalleryIndex] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Support both new (media array) and legacy (messages array) props
  const media = useMemo(() => {
    if (mediaProp && mediaProp.length > 0) {
      return mediaProp;
    }
    if (messages && messages.length > 0) {
      return extractMedia(messages);
    }
    return [];
  }, [mediaProp, messages]);

  const sortedMedia = useMemo(() => {
    const sorted = [...media];
    sorted.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return sorted;
  }, [media, sortOrder]);

  const handleGoToMessage = useCallback((item) => {
    setGalleryIndex(null);
    // Support both messageId and message_id
    const msgId = item.messageId || item.message_id;
    if (onGoToMessage && msgId) {
      onGoToMessage(msgId);
    }
  }, [onGoToMessage]);

  if (media.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No photos or videos
      </div>
    );
  }

  return (
    <>
      <div className="flex-shrink-0 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{media.length} items</span>
        <SortToggle sortOrder={sortOrder} onToggle={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
        <div className="grid grid-cols-4 gap-0.5">
          {sortedMedia.map((item, idx) => (
            <MediaThumbnail 
              key={item.id || idx} 
              item={item} 
              onClick={() => setGalleryIndex(idx)} 
            />
          ))}
        </div>
      </div>
      
      {galleryIndex !== null && (
        <MediaGallery
          media={sortedMedia}
          currentIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onNavigate={setGalleryIndex}
          onGoToMessage={handleGoToMessage}
        />
      )}
    </>
  );
});

export default MediaGrid;
