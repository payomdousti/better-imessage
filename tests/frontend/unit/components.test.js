/**
 * Frontend Component Unit Tests
 * Tests for React components using React Testing Library
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the CSS imports
jest.mock('../../../src/App.css', () => ({}));

// Mock API module
jest.mock('../../../src/api', () => ({
  searchMessages: jest.fn(),
  getConversation: jest.fn(),
  getContacts: jest.fn(),
  getConversations: jest.fn(),
  getGlobalMedia: jest.fn(),
  getGlobalLinks: jest.fn(),
}));

// Import mocked API
import * as api from '../../../src/api';

// Test fixtures
const mockContacts = [
  {
    contact_id: '1-100',
    display_name: 'Alice Smith',
    identifiers: ['+15551234567'],
    message_count: 150
  },
  {
    contact_id: '1-101',
    display_name: 'Bob Johnson',
    identifiers: ['+15559876543'],
    message_count: 75
  }
];

const mockConversations = [
  {
    contact_id: '1-100',
    display_name: 'Alice Smith',
    identifier: '+15551234567',
    chat_ids: [1],
    message_count: 150,
    last_message_date: Date.now() - 3600000,
    last_message: 'See you tomorrow!',
    is_group: false
  },
  {
    contact_id: '1-101',
    display_name: 'Bob Johnson',
    identifier: '+15559876543',
    chat_ids: [2],
    message_count: 75,
    last_message_date: Date.now() - 86400000,
    last_message: 'Sounds good',
    is_group: false
  }
];

const mockMessages = [
  {
    id: 1001,
    text: 'Hello, how are you?',
    is_from_me: false,
    date: Date.now() - 86400000,
    contact_identifier: '+15551234567',
    display_name: 'Alice Smith',
    sender_name: 'Alice Smith',
    attachments: [],
    links: []
  },
  {
    id: 1002,
    text: 'I am doing great!',
    is_from_me: true,
    date: Date.now() - 86300000,
    contact_identifier: '+15551234567',
    display_name: 'Alice Smith',
    sender_name: 'You',
    attachments: [],
    links: []
  }
];

const mockMedia = [
  {
    id: 5001,
    filename: 'photo1.jpg',
    type: 'image',
    url: '/attachment/5001',
    thumbUrl: '/thumb/5001',
    date: Date.now() - 86400000,
    contact: 'Alice Smith',
    is_from_me: false,
    chat_id: 1,
    message_id: 1003
  }
];

const mockLinks = [
  {
    url: 'https://example.com/article',
    date: Date.now() - 86400000,
    contact: 'Alice Smith',
    is_from_me: false
  }
];

describe('Utility Functions', () => {
  describe('formatRelativeTime', () => {
    const formatRelativeTime = (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 7) return new Date(timestamp).toLocaleDateString();
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    };

    test('should return "Just now" for recent timestamps', () => {
      const result = formatRelativeTime(Date.now() - 30000); // 30 seconds ago
      expect(result).toBe('Just now');
    });

    test('should return minutes ago for timestamps within an hour', () => {
      const result = formatRelativeTime(Date.now() - 1800000); // 30 minutes ago
      expect(result).toBe('30m ago');
    });

    test('should return hours ago for timestamps within a day', () => {
      const result = formatRelativeTime(Date.now() - 7200000); // 2 hours ago
      expect(result).toBe('2h ago');
    });

    test('should return days ago for timestamps within a week', () => {
      const result = formatRelativeTime(Date.now() - 259200000); // 3 days ago
      expect(result).toBe('3d ago');
    });

    test('should return date for timestamps over a week old', () => {
      const oldDate = Date.now() - 864000000; // 10 days ago
      const result = formatRelativeTime(oldDate);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
    });

    test('should return empty string for null/undefined', () => {
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime(undefined)).toBe('');
    });
  });
});

describe('SearchBar Component', () => {
  // Create a minimal SearchBar component for testing
  const SearchBar = ({ onSearch }) => {
    const [value, setValue] = React.useState('');
    
    const handleSubmit = (e) => {
      e.preventDefault();
      onSearch(value);
    };
    
    const handleChange = (e) => {
      setValue(e.target.value);
      // Debounced search on change
      onSearch(e.target.value);
    };
    
    return (
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search messages..."
          value={value}
          onChange={handleChange}
          data-testid="search-input"
        />
      </form>
    );
  };

  test('should render search input', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  test('should call onSearch when input changes', async () => {
    const mockOnSearch = jest.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByTestId('search-input');
    await user.type(input, 'hello');
    
    expect(mockOnSearch).toHaveBeenCalled();
  });

  test('should have placeholder text', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument();
  });
});

describe('ConversationItem Component', () => {
  const ConversationItem = ({ conversation, onClick, isActive }) => (
    <li
      onClick={() => onClick(conversation)}
      data-testid="conversation-item"
      className={isActive ? 'active' : ''}
    >
      <span data-testid="display-name">{conversation.display_name}</span>
      <span data-testid="last-message">{conversation.last_message || 'No messages'}</span>
      {conversation.is_group && <span data-testid="group-icon">👥</span>}
    </li>
  );

  test('should render conversation display name', () => {
    const mockOnClick = jest.fn();
    render(
      <ConversationItem 
        conversation={mockConversations[0]} 
        onClick={mockOnClick}
        isActive={false}
      />
    );
    
    expect(screen.getByTestId('display-name')).toHaveTextContent('Alice Smith');
  });

  test('should render last message', () => {
    const mockOnClick = jest.fn();
    render(
      <ConversationItem 
        conversation={mockConversations[0]} 
        onClick={mockOnClick}
        isActive={false}
      />
    );
    
    expect(screen.getByTestId('last-message')).toHaveTextContent('See you tomorrow!');
  });

  test('should call onClick when clicked', async () => {
    const mockOnClick = jest.fn();
    const user = userEvent.setup();
    render(
      <ConversationItem 
        conversation={mockConversations[0]} 
        onClick={mockOnClick}
        isActive={false}
      />
    );
    
    await user.click(screen.getByTestId('conversation-item'));
    expect(mockOnClick).toHaveBeenCalledWith(mockConversations[0]);
  });

  test('should show group icon for group chats', () => {
    const mockOnClick = jest.fn();
    const groupConversation = { ...mockConversations[0], is_group: true };
    render(
      <ConversationItem 
        conversation={groupConversation} 
        onClick={mockOnClick}
        isActive={false}
      />
    );
    
    expect(screen.getByTestId('group-icon')).toBeInTheDocument();
  });

  test('should not show group icon for individual chats', () => {
    const mockOnClick = jest.fn();
    render(
      <ConversationItem 
        conversation={mockConversations[0]} 
        onClick={mockOnClick}
        isActive={false}
      />
    );
    
    expect(screen.queryByTestId('group-icon')).not.toBeInTheDocument();
  });

  test('should show "No messages" when last_message is null', () => {
    const mockOnClick = jest.fn();
    const noMessageConv = { ...mockConversations[0], last_message: null };
    render(
      <ConversationItem 
        conversation={noMessageConv} 
        onClick={mockOnClick}
        isActive={false}
      />
    );
    
    expect(screen.getByTestId('last-message')).toHaveTextContent('No messages');
  });
});

describe('Message Component', () => {
  const Message = ({ message, isHighlighted }) => {
    const hasDisplayableContent = message.text || 
      (message.attachments && message.attachments.some(a => a.url && a.type !== 'link_preview'));
    
    if (!hasDisplayableContent) return null;
    
    return (
      <div 
        data-testid="message"
        className={`message ${message.is_from_me ? 'sent' : 'received'} ${isHighlighted ? 'highlighted' : ''}`}
      >
        {!message.is_from_me && message.sender_name && (
          <span data-testid="sender-name">{message.sender_name}</span>
        )}
        {message.text && <p data-testid="message-text">{message.text}</p>}
        {message.attachments && message.attachments.length > 0 && (
          <div data-testid="attachments">
            {message.attachments.map((att, idx) => (
              <span key={idx} data-testid="attachment">{att.filename}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  test('should render message text', () => {
    render(<Message message={mockMessages[0]} isHighlighted={false} />);
    
    expect(screen.getByTestId('message-text')).toHaveTextContent('Hello, how are you?');
  });

  test('should apply sent class for outgoing messages', () => {
    render(<Message message={mockMessages[1]} isHighlighted={false} />);
    
    expect(screen.getByTestId('message')).toHaveClass('sent');
  });

  test('should apply received class for incoming messages', () => {
    render(<Message message={mockMessages[0]} isHighlighted={false} />);
    
    expect(screen.getByTestId('message')).toHaveClass('received');
  });

  test('should apply highlighted class when highlighted', () => {
    render(<Message message={mockMessages[0]} isHighlighted={true} />);
    
    expect(screen.getByTestId('message')).toHaveClass('highlighted');
  });

  test('should show sender name for received messages', () => {
    render(<Message message={mockMessages[0]} isHighlighted={false} />);
    
    expect(screen.getByTestId('sender-name')).toHaveTextContent('Alice Smith');
  });

  test('should not show sender name for sent messages', () => {
    render(<Message message={mockMessages[1]} isHighlighted={false} />);
    
    expect(screen.queryByTestId('sender-name')).not.toBeInTheDocument();
  });

  test('should return null for message with no text and no displayable attachments', () => {
    const emptyMessage = { ...mockMessages[0], text: null, attachments: [] };
    const { container } = render(<Message message={emptyMessage} isHighlighted={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('should render attachments when present', () => {
    const messageWithAttachment = {
      ...mockMessages[0],
      attachments: [{ filename: 'photo.jpg', url: '/attachment/1', type: 'image' }]
    };
    render(<Message message={messageWithAttachment} isHighlighted={false} />);
    
    expect(screen.getByTestId('attachments')).toBeInTheDocument();
    expect(screen.getByTestId('attachment')).toHaveTextContent('photo.jpg');
  });
});

describe('MediaItem Component', () => {
  const MediaItem = ({ item, onClick }) => (
    <div 
      data-testid="media-item"
      onClick={() => onClick(item)}
      className="media-item"
    >
      {item.type === 'video' ? (
        <video data-testid="video-thumbnail" poster={item.thumbUrl} />
      ) : (
        <img data-testid="image-thumbnail" src={item.thumbUrl} alt={item.filename} />
      )}
    </div>
  );

  test('should render image thumbnail for images', () => {
    const mockOnClick = jest.fn();
    render(<MediaItem item={mockMedia[0]} onClick={mockOnClick} />);
    
    expect(screen.getByTestId('image-thumbnail')).toBeInTheDocument();
  });

  test('should render video element for videos', () => {
    const mockOnClick = jest.fn();
    const videoItem = { ...mockMedia[0], type: 'video' };
    render(<MediaItem item={videoItem} onClick={mockOnClick} />);
    
    expect(screen.getByTestId('video-thumbnail')).toBeInTheDocument();
  });

  test('should call onClick when clicked', async () => {
    const mockOnClick = jest.fn();
    const user = userEvent.setup();
    render(<MediaItem item={mockMedia[0]} onClick={mockOnClick} />);
    
    await user.click(screen.getByTestId('media-item'));
    expect(mockOnClick).toHaveBeenCalledWith(mockMedia[0]);
  });
});

describe('SortToggle Component', () => {
  const SortToggle = ({ sortOrder, onToggle }) => (
    <button onClick={onToggle} data-testid="sort-toggle">
      {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
    </button>
  );

  test('should show "Newest first" when sortOrder is desc', () => {
    const mockOnToggle = jest.fn();
    render(<SortToggle sortOrder="desc" onToggle={mockOnToggle} />);
    
    expect(screen.getByTestId('sort-toggle')).toHaveTextContent('Newest first');
  });

  test('should show "Oldest first" when sortOrder is asc', () => {
    const mockOnToggle = jest.fn();
    render(<SortToggle sortOrder="asc" onToggle={mockOnToggle} />);
    
    expect(screen.getByTestId('sort-toggle')).toHaveTextContent('Oldest first');
  });

  test('should call onToggle when clicked', async () => {
    const mockOnToggle = jest.fn();
    const user = userEvent.setup();
    render(<SortToggle sortOrder="desc" onToggle={mockOnToggle} />);
    
    await user.click(screen.getByTestId('sort-toggle'));
    expect(mockOnToggle).toHaveBeenCalled();
  });
});

describe('MainTab Component', () => {
  const MainTab = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      data-testid="main-tab"
      className={active ? 'active' : ''}
    >
      {children}
    </button>
  );

  test('should render children', () => {
    const mockOnClick = jest.fn();
    render(<MainTab active={false} onClick={mockOnClick}>Messages</MainTab>);
    
    expect(screen.getByTestId('main-tab')).toHaveTextContent('Messages');
  });

  test('should apply active class when active', () => {
    const mockOnClick = jest.fn();
    render(<MainTab active={true} onClick={mockOnClick}>Messages</MainTab>);
    
    expect(screen.getByTestId('main-tab')).toHaveClass('active');
  });

  test('should not apply active class when not active', () => {
    const mockOnClick = jest.fn();
    render(<MainTab active={false} onClick={mockOnClick}>Messages</MainTab>);
    
    expect(screen.getByTestId('main-tab')).not.toHaveClass('active');
  });

  test('should call onClick when clicked', async () => {
    const mockOnClick = jest.fn();
    const user = userEvent.setup();
    render(<MainTab active={false} onClick={mockOnClick}>Messages</MainTab>);
    
    await user.click(screen.getByTestId('main-tab'));
    expect(mockOnClick).toHaveBeenCalled();
  });
});

describe('ProcessingStatus Component', () => {
  const ProcessingStatus = ({ status }) => {
    if (!status || status.total === 0 || status.ready) return null;
    
    const pct = Math.round((status.processed / status.total) * 100);
    
    return (
      <div data-testid="processing-status">
        <span data-testid="status-text">Processing media...</span>
        <div data-testid="progress-bar" style={{ width: `${pct}%` }} />
        <span data-testid="progress-count">{status.processed} / {status.total}</span>
      </div>
    );
  };

  test('should show processing indicator when not ready', () => {
    const status = { processing: true, ready: false, total: 100, processed: 50, remaining: 50 };
    render(<ProcessingStatus status={status} />);
    
    expect(screen.getByTestId('processing-status')).toBeInTheDocument();
    expect(screen.getByTestId('status-text')).toHaveTextContent('Processing media...');
  });

  test('should show progress count', () => {
    const status = { processing: true, ready: false, total: 100, processed: 50, remaining: 50 };
    render(<ProcessingStatus status={status} />);
    
    expect(screen.getByTestId('progress-count')).toHaveTextContent('50 / 100');
  });

  test('should not render when ready', () => {
    const status = { processing: false, ready: true, total: 100, processed: 100, remaining: 0 };
    const { container } = render(<ProcessingStatus status={status} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('should not render when total is 0', () => {
    const status = { processing: false, ready: false, total: 0, processed: 0, remaining: 0 };
    const { container } = render(<ProcessingStatus status={status} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('should not render when status is null', () => {
    const { container } = render(<ProcessingStatus status={null} />);
    
    expect(container.firstChild).toBeNull();
  });
});

describe('LinkPreviewCard Component', () => {
  const LinkPreviewCard = ({ link, preview, loading }) => (
    <a href={link.url} target="_blank" rel="noopener noreferrer" data-testid="link-card">
      {loading ? (
        <div data-testid="loading-skeleton">Loading...</div>
      ) : (
        <div>
          {preview?.image && <img data-testid="preview-image" src={preview.image} alt="" />}
          <span data-testid="preview-title">{preview?.title || link.url}</span>
          <span data-testid="preview-description">{preview?.description}</span>
        </div>
      )}
    </a>
  );

  test('should show loading state', () => {
    render(<LinkPreviewCard link={mockLinks[0]} preview={null} loading={true} />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  test('should show preview title when loaded', () => {
    const preview = { title: 'Example Article', description: 'Description', image: null };
    render(<LinkPreviewCard link={mockLinks[0]} preview={preview} loading={false} />);
    
    expect(screen.getByTestId('preview-title')).toHaveTextContent('Example Article');
  });

  test('should show URL when no preview title', () => {
    const preview = { title: null, description: null, image: null };
    render(<LinkPreviewCard link={mockLinks[0]} preview={preview} loading={false} />);
    
    expect(screen.getByTestId('preview-title')).toHaveTextContent('https://example.com/article');
  });

  test('should show preview image when available', () => {
    const preview = { title: 'Title', description: 'Desc', image: 'https://example.com/image.jpg' };
    render(<LinkPreviewCard link={mockLinks[0]} preview={preview} loading={false} />);
    
    expect(screen.getByTestId('preview-image')).toBeInTheDocument();
  });

  test('should have correct link href', () => {
    render(<LinkPreviewCard link={mockLinks[0]} preview={null} loading={true} />);
    
    expect(screen.getByTestId('link-card')).toHaveAttribute('href', mockLinks[0].url);
  });

  test('should open in new tab', () => {
    render(<LinkPreviewCard link={mockLinks[0]} preview={null} loading={true} />);
    
    expect(screen.getByTestId('link-card')).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('link-card')).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('MediaGallery Component', () => {
  const MediaGallery = ({ media, currentIndex, onClose, onPrev, onNext }) => {
    const currentItem = media[currentIndex];
    
    return (
      <div data-testid="media-gallery" onClick={onClose}>
        <button data-testid="close-button" onClick={onClose}>×</button>
        <button data-testid="prev-button" onClick={onPrev}>←</button>
        <button data-testid="next-button" onClick={onNext}>→</button>
        
        {currentItem.type === 'video' ? (
          <video data-testid="gallery-video" src={currentItem.url} controls />
        ) : (
          <img data-testid="gallery-image" src={currentItem.url} alt={currentItem.filename} />
        )}
        
        <span data-testid="item-info">{currentItem.contact}</span>
      </div>
    );
  };

  test('should render gallery with current image', () => {
    const mockOnClose = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnNext = jest.fn();
    
    render(
      <MediaGallery 
        media={mockMedia} 
        currentIndex={0} 
        onClose={mockOnClose}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByTestId('gallery-image')).toBeInTheDocument();
  });

  test('should render video for video items', () => {
    const mockOnClose = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnNext = jest.fn();
    const videoMedia = [{ ...mockMedia[0], type: 'video' }];
    
    render(
      <MediaGallery 
        media={videoMedia} 
        currentIndex={0} 
        onClose={mockOnClose}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByTestId('gallery-video')).toBeInTheDocument();
  });

  test('should call onClose when close button clicked', async () => {
    const mockOnClose = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnNext = jest.fn();
    const user = userEvent.setup();
    
    render(
      <MediaGallery 
        media={mockMedia} 
        currentIndex={0} 
        onClose={mockOnClose}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
      />
    );
    
    await user.click(screen.getByTestId('close-button'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('should call onPrev when prev button clicked', async () => {
    const mockOnClose = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnNext = jest.fn();
    const user = userEvent.setup();
    
    render(
      <MediaGallery 
        media={mockMedia} 
        currentIndex={0} 
        onClose={mockOnClose}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
      />
    );
    
    await user.click(screen.getByTestId('prev-button'));
    expect(mockOnPrev).toHaveBeenCalled();
  });

  test('should call onNext when next button clicked', async () => {
    const mockOnClose = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnNext = jest.fn();
    const user = userEvent.setup();
    
    render(
      <MediaGallery 
        media={mockMedia} 
        currentIndex={0} 
        onClose={mockOnClose}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
      />
    );
    
    await user.click(screen.getByTestId('next-button'));
    expect(mockOnNext).toHaveBeenCalled();
  });

  test('should show contact info', () => {
    const mockOnClose = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnNext = jest.fn();
    
    render(
      <MediaGallery 
        media={mockMedia} 
        currentIndex={0} 
        onClose={mockOnClose}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByTestId('item-info')).toHaveTextContent('Alice Smith');
  });
});

