import React, { memo, useMemo } from 'react';
import { LinkPreview } from './LinkPreview';
import { extractLinks } from '../../utils/messages';

/**
 * LinksList component
 * 
 * Accepts either:
 * - `links`: Array of link objects from API
 * - `messages`: Array of messages to extract links from (legacy)
 */
export const LinksList = memo(function LinksList({ links: linksProp, messages }) {
  // Support both new (links array) and legacy (messages array) props
  const links = useMemo(() => {
    if (linksProp && linksProp.length > 0) {
      return linksProp;
    }
    if (messages && messages.length > 0) {
      return extractLinks(messages);
    }
    return [];
  }, [linksProp, messages]);

  if (links.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No links
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
      {links.map((link, idx) => (
        <div key={idx}>
          <LinkPreview url={link.url} />
          <p className="text-xs text-muted-foreground mt-1 px-1">
            {link.is_from_me ? 'You' : 'Them'} · {new Date(link.date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
});

export default LinksList;
