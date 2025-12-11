import React, { memo } from 'react';
import { useLinkPreview } from '../../hooks/useLinkPreview';
import { getHostname } from '../../utils/format';

export const LinkPreview = memo(function LinkPreview({ url }) {
  const { preview, loading } = useLinkPreview(url);
  const hostname = getHostname(url);

  if (loading) {
    return (
      <div className="block p-3 border rounded-lg bg-background">
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-muted rounded flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block border rounded-lg bg-background hover:bg-accent/30 transition-colors overflow-hidden"
    >
      <div className="flex">
        {preview?.image && (
          <div className="w-20 h-20 flex-shrink-0 bg-muted">
            <img 
              src={preview.image} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => e.target.style.display = 'none'} 
            />
          </div>
        )}
        <div className="flex-1 p-3 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {preview?.title || hostname}
          </p>
          {preview?.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {preview.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">
            {preview?.siteName || hostname}
          </p>
        </div>
      </div>
    </a>
  );
});

export default LinkPreview;

