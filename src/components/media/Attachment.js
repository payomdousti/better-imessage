import React, { memo } from 'react';

/**
 * Attachment - Renders a media attachment (image, video, audio, or file)
 * Uses native lazy loading for images
 */
export const Attachment = memo(function Attachment({ attachment, onImageClick }) {
  if (!attachment.url) {
    return (
      <div className="px-3 py-2 bg-black/10 rounded-lg text-xs text-muted-foreground">
        📎 {attachment.filename} (unavailable)
      </div>
    );
  }

  if (attachment.type === 'image') {
    const displayUrl = attachment.thumbUrl || attachment.url;
    return (
      <img
        src={displayUrl}
        alt={attachment.filename || ''}
        className="rounded-2xl hover:opacity-90 transition-opacity cursor-pointer"
        style={{ maxWidth: 240, maxHeight: 240, objectFit: 'cover' }}
        loading="lazy"
        onClick={onImageClick}
      />
    );
  }

  if (attachment.type === 'video') {
    return (
      <div 
        className="relative cursor-pointer overflow-hidden rounded-2xl" 
        onClick={onImageClick} 
        style={{ maxWidth: 240 }}
      >
        {attachment.thumbUrl ? (
          <>
            <img 
              src={attachment.thumbUrl} 
              alt="" 
              className="w-full h-auto" 
              style={{ maxHeight: 240, objectFit: 'cover' }}
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <svg className="h-6 w-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <div className="w-48 h-32 bg-muted/30 flex items-center justify-center">
            <svg className="h-10 w-10 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <audio 
        src={attachment.url} 
        controls 
        className="w-full max-w-[250px]" 
        preload="none" 
      />
    );
  }

  // Generic file download
  const sizeKB = Math.round((attachment.size || 0) / 1024);
  return (
    <a 
      href={attachment.url} 
      download={attachment.filename}
      className="flex items-center gap-2 px-3 py-2 bg-black/10 rounded-lg text-xs hover:bg-black/20 transition-colors"
    >
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate">{attachment.filename}</span>
      {sizeKB > 0 && <span className="text-muted-foreground flex-shrink-0">({sizeKB} KB)</span>}
    </a>
  );
});

export default Attachment;
