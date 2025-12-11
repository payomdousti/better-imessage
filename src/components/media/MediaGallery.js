import React, { memo, useState, useEffect } from 'react';
import { Spinner } from '../ui/Spinner';
import { formatDate } from '../../utils/format';

export const MediaGallery = memo(function MediaGallery({ 
  media, 
  currentIndex, 
  onClose, 
  onNavigate, 
  onGoToMessage 
}) {
  const currentItem = media[currentIndex];
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNavigate(Math.max(0, currentIndex - 1));
      else if (e.key === 'ArrowRight') onNavigate(Math.min(media.length - 1, currentIndex + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, media.length, onClose, onNavigate]);

  useEffect(() => { setLoading(true); }, [currentIndex]);

  // Support both camelCase (from frontend extraction) and snake_case (from API)
  const canGoToMessage = onGoToMessage && (currentItem.chat_id || currentItem.messageId || currentItem.message_id);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 text-white" onClick={e => e.stopPropagation()}>
        <span className="text-sm text-white/70">{currentIndex + 1} / {media.length}</span>
        <div className="flex items-center gap-2">
          {canGoToMessage && (
            <button 
              onClick={() => onGoToMessage(currentItem)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Go to message
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 relative min-h-0" onClick={e => e.stopPropagation()}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Spinner size="lg" className="border-white/20 border-t-white" />
          </div>
        )}
        
        {/* Nav buttons */}
        {currentIndex > 0 && (
          <button 
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {currentIndex < media.length - 1 && (
          <button 
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        {/* Media */}
        <div className="absolute inset-0 flex items-center justify-center px-16 py-4">
          {currentItem.type === 'video' ? (
            <video 
              key={currentItem.id} 
              src={currentItem.url} 
              controls 
              autoPlay
              className={`max-w-full max-h-full object-contain transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
              style={{ maxHeight: 'calc(100vh - 160px)' }}
              onLoadedData={() => setLoading(false)} 
            />
          ) : (
            <img 
              key={currentItem.id} 
              src={currentItem.url} 
              alt=""
              className={`max-w-full max-h-full object-contain transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
              style={{ maxHeight: 'calc(100vh - 160px)' }}
              onLoad={() => setLoading(false)} 
            />
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 p-4 text-center text-sm text-white/50" onClick={e => e.stopPropagation()}>
        {formatDate(currentItem.date)}
      </div>
      <div className="absolute bottom-4 left-4 text-xs text-white/30">← → navigate · Esc close</div>
    </div>
  );
});

export default MediaGallery;

