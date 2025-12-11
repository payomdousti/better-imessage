import React, { memo, useMemo } from 'react';
import { Attachment } from '../media/Attachment';
import { cleanMessageText, hasVisibleText, getDisplayableAttachments } from '../../utils/messages';

/**
 * MessageBubble - Renders a single message with text and/or attachments
 */
export const MessageBubble = memo(function MessageBubble({ 
  message, 
  isHighlighted, 
  innerRef, 
  onMediaClick, 
  isLastInGroup 
}) {
  const isSent = message.is_from_me;
  
  // Process message content
  const { textContent, hasText, attachments, hasAttachments } = useMemo(() => {
    const text = cleanMessageText(message.text);
    const atts = getDisplayableAttachments(message.attachments);
    return {
      textContent: text,
      hasText: text.length > 0,
      attachments: atts,
      hasAttachments: atts.length > 0
    };
  }, [message.text, message.attachments]);

  // Don't render empty messages
  if (!hasText && !hasAttachments) return null;

  // Determine bubble corner rounding
  const bubbleRadius = isSent
    ? `rounded-2xl ${isLastInGroup ? 'rounded-br-md' : ''}`
    : `rounded-2xl ${isLastInGroup ? 'rounded-bl-md' : ''}`;

  return (
    <div
      ref={innerRef}
      data-message-id={message.id}
      className={`message-bubble flex flex-col gap-1 ${isHighlighted ? 'animate-highlight-pulse' : ''}`}
    >
      {/* Attachments - rendered without bubble background */}
      {hasAttachments && (
        <div className={isHighlighted && !hasText ? 'ring-2 ring-primary/50 rounded-xl' : ''}>
          {attachments.map((att, idx) => (
            <div key={att.id || idx} className="mt-1 first:mt-0">
              <Attachment 
                attachment={att} 
                onImageClick={() => onMediaClick?.(message.id, att.id)}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Text bubble */}
      {hasText && (
        <div
          className={`
            break-words overflow-hidden px-3 py-[6px] max-w-[320px] w-fit
            ${isSent ? 'bg-primary text-white' : 'bg-bubble-received text-foreground'}
            ${bubbleRadius}
            ${isHighlighted ? 'ring-2 ring-primary/50' : ''}
          `}
        >
          <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">{textContent}</p>
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
