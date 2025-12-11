import React, { memo, useMemo } from 'react';
import { Avatar } from '../ui/Avatar';
import { MessageBubble } from './MessageBubble';
import { hasVisibleText, getDisplayableAttachments } from '../../utils/messages';

// Check if a message has any displayable content
function hasDisplayableContent(message) {
  const hasText = hasVisibleText(message.text);
  const hasAttachments = getDisplayableAttachments(message.attachments).length > 0;
  return hasText || hasAttachments;
}

export const MessageGroup = memo(function MessageGroup({ 
  messages, 
  senderName, 
  isGroupChat, 
  highlightedId, 
  highlightedRef, 
  onMediaClick 
}) {
  // Filter to only messages with displayable content - memoized
  const displayableMessages = useMemo(
    () => messages.filter(hasDisplayableContent),
    [messages]
  );

  // Don't render anything if no displayable messages
  if (displayableMessages.length === 0) return null;

  const isSent = displayableMessages[0]?.is_from_me;
  const showSenderInfo = !isSent && (isGroupChat || senderName);

  return (
    <div 
      className={`flex gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
      style={{ contain: 'content' }}
    >
      {/* Avatar for received messages */}
      {!isSent && (
        <div className="self-end flex-shrink-0">
          <Avatar name={senderName} size="sm" />
        </div>
      )}
      
      <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} gap-[3px] max-w-[75%]`}>
        {/* Sender name */}
        {showSenderInfo && senderName && (
          <span className="text-[11px] text-muted-foreground ml-0.5 mb-0.5">{senderName}</span>
        )}
        
        {/* Bubbles */}
        {displayableMessages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            isHighlighted={String(message.id) === String(highlightedId)}
            innerRef={String(message.id) === String(highlightedId) ? highlightedRef : null}
            onMediaClick={onMediaClick}
            isLastInGroup={idx === displayableMessages.length - 1}
          />
        ))}
      </div>
    </div>
  );
});

export default MessageGroup;
