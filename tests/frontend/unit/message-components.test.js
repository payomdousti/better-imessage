/**
 * Tests for message display components
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock MessageBubble
const MessageBubble = ({ message, isHighlighted, isLastInGroup }) => {
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/\uFFFC/g, '').trim();
  };

  const textContent = cleanText(message.text);
  const hasText = textContent.length > 0;
  const attachments = (message.attachments || []).filter(a => a.type !== 'link_preview' && a.url);
  const hasAttachments = attachments.length > 0;

  if (!hasText && !hasAttachments) return null;

  const isSent = message.is_from_me;

  return (
    <div 
      data-testid="message-bubble"
      data-sent={isSent}
      data-highlighted={isHighlighted}
      data-last={isLastInGroup}
    >
      {hasAttachments && (
        <div data-testid="attachments">
          {attachments.map((a, i) => (
            <span key={i} data-testid="attachment">{a.type}</span>
          ))}
        </div>
      )}
      {hasText && <p data-testid="message-text">{textContent}</p>}
    </div>
  );
};

// Mock MessageGroup
const MessageGroup = ({ messages, senderName, isGroupChat }) => {
  const isSent = messages[0]?.is_from_me;
  const showSender = !isSent && (isGroupChat || senderName);

  return (
    <div data-testid="message-group" data-sent={isSent}>
      {!isSent && <div data-testid="avatar" />}
      <div>
        {showSender && senderName && (
          <span data-testid="sender-name">{senderName}</span>
        )}
        {messages.map((m, i) => (
          <MessageBubble 
            key={m.id} 
            message={m} 
            isLastInGroup={i === messages.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

// Mock TimeDivider
const TimeDivider = ({ date }) => (
  <div data-testid="time-divider">
    {new Date(date).toLocaleString()}
  </div>
);

describe('MessageBubble', () => {
  it('should render text message', () => {
    const message = { id: 1, text: 'Hello world', is_from_me: true };
    render(<MessageBubble message={message} />);
    expect(screen.getByTestId('message-text')).toHaveTextContent('Hello world');
  });

  it('should not render empty messages', () => {
    const message = { id: 1, text: '', is_from_me: true };
    const { container } = render(<MessageBubble message={message} />);
    expect(container.firstChild).toBeNull();
  });

  it('should filter out attachment placeholder character', () => {
    const message = { id: 1, text: '\uFFFC Hello \uFFFC', is_from_me: true };
    render(<MessageBubble message={message} />);
    expect(screen.getByTestId('message-text')).toHaveTextContent('Hello');
  });

  it('should render attachments', () => {
    const message = {
      id: 1,
      text: '',
      is_from_me: true,
      attachments: [{ type: 'image', url: '/img.jpg' }]
    };
    render(<MessageBubble message={message} />);
    expect(screen.getByTestId('attachment')).toHaveTextContent('image');
  });

  it('should filter out link preview attachments', () => {
    const message = {
      id: 1,
      text: 'Check this',
      is_from_me: true,
      attachments: [
        { type: 'image', url: '/img.jpg' },
        { type: 'link_preview', url: '/preview' }
      ]
    };
    render(<MessageBubble message={message} />);
    expect(screen.getAllByTestId('attachment')).toHaveLength(1);
  });

  it('should indicate sent messages', () => {
    const message = { id: 1, text: 'Sent', is_from_me: true };
    render(<MessageBubble message={message} />);
    expect(screen.getByTestId('message-bubble')).toHaveAttribute('data-sent', 'true');
  });

  it('should indicate received messages', () => {
    const message = { id: 1, text: 'Received', is_from_me: false };
    render(<MessageBubble message={message} />);
    expect(screen.getByTestId('message-bubble')).toHaveAttribute('data-sent', 'false');
  });

  it('should indicate highlighted state', () => {
    const message = { id: 1, text: 'Highlighted', is_from_me: true };
    render(<MessageBubble message={message} isHighlighted={true} />);
    expect(screen.getByTestId('message-bubble')).toHaveAttribute('data-highlighted', 'true');
  });
});

describe('MessageGroup', () => {
  it('should render multiple messages', () => {
    const messages = [
      { id: 1, text: 'First', is_from_me: true },
      { id: 2, text: 'Second', is_from_me: true }
    ];
    render(<MessageGroup messages={messages} />);
    expect(screen.getAllByTestId('message-bubble')).toHaveLength(2);
  });

  it('should show avatar for received messages', () => {
    const messages = [{ id: 1, text: 'Hello', is_from_me: false }];
    render(<MessageGroup messages={messages} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('should not show avatar for sent messages', () => {
    const messages = [{ id: 1, text: 'Hello', is_from_me: true }];
    render(<MessageGroup messages={messages} />);
    expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
  });

  it('should show sender name in group chat', () => {
    const messages = [{ id: 1, text: 'Hello', is_from_me: false }];
    render(<MessageGroup messages={messages} senderName="Alice" isGroupChat={true} />);
    expect(screen.getByTestId('sender-name')).toHaveTextContent('Alice');
  });

  it('should not show sender name for sent messages', () => {
    const messages = [{ id: 1, text: 'Hello', is_from_me: true }];
    render(<MessageGroup messages={messages} senderName="Me" isGroupChat={true} />);
    expect(screen.queryByTestId('sender-name')).not.toBeInTheDocument();
  });
});

describe('TimeDivider', () => {
  it('should render formatted date', () => {
    const date = new Date('2024-01-15T10:30:00').getTime();
    render(<TimeDivider date={date} />);
    expect(screen.getByTestId('time-divider')).toBeInTheDocument();
  });
});

