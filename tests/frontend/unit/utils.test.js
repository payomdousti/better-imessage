/**
 * Tests for utility functions
 */

// Mock format.js functions
const formatUtils = {
  formatRelativeTime: (timestamp) => {
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
  },

  formatMessageTime: (date) => {
    return new Date(date).toLocaleString(undefined, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  },

  getHostname: (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  },

  getInitials: (name) => {
    if (!name) return null;
    const hasLetters = /[a-zA-Z]{2,}/.test(name);
    if (!hasLetters) return null;
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
};

// Mock messages.js functions
const messageUtils = {
  cleanMessageText: (text) => {
    if (!text) return '';
    return text.replace(/\uFFFC/g, '').trim();
  },

  hasVisibleText: (text) => {
    const cleaned = messageUtils.cleanMessageText(text);
    return cleaned.length > 0;
  },

  groupMessages: (messages, timeGapMs = 30 * 60 * 1000) => {
    const groups = [];
    let currentGroup = null;
    let lastTimestamp = null;
    
    for (const message of messages) {
      const senderId = message.is_from_me 
        ? '__me__' 
        : (message.sender_name || message.handle_id || 'other');
      const timestamp = message.date;
      
      const needsTimeDivider = lastTimestamp && (timestamp - lastTimestamp > timeGapMs);
      const continuesGroup = currentGroup && 
                            currentGroup.senderId === senderId && 
                            !needsTimeDivider;
      
      if (needsTimeDivider) {
        groups.push({ type: 'time', date: timestamp });
      }
      
      if (continuesGroup) {
        currentGroup.messages.push(message);
      } else {
        currentGroup = {
          type: 'messages',
          senderId,
          senderName: message.is_from_me ? null : message.sender_name,
          messages: [message]
        };
        groups.push(currentGroup);
      }
      
      lastTimestamp = timestamp;
    }
    
    return groups;
  },

  getDisplayableAttachments: (attachments) => {
    if (!attachments) return [];
    return attachments.filter(a => a.type !== 'link_preview' && a.url);
  },

  extractMedia: (messages) => {
    const items = [];
    for (const m of messages) {
      for (const a of (m.attachments || [])) {
        if ((a.type === 'image' || a.type === 'video') && a.url) {
          items.push({ ...a, date: m.date, messageId: m.id });
        }
      }
    }
    return items;
  },

  extractLinks: (messages) => {
    const items = [];
    const seen = new Set();
    
    for (const m of messages) {
      for (const url of (m.links || [])) {
        if (!seen.has(url)) {
          seen.add(url);
          items.push({ url, date: m.date, messageId: m.id, is_from_me: m.is_from_me });
        }
      }
    }
    
    return items.sort((a, b) => b.date - a.date);
  },

  detectGroupChat: (messages) => {
    const uniqueSenders = new Set(
      messages.map(m => m.sender_name).filter(s => s && s !== 'You')
    );
    const identifier = messages[0]?.contact_identifier || '';
    return uniqueSenders.size > 1 || identifier.includes(',');
  }
};

describe('Format Utilities', () => {
  describe('formatRelativeTime', () => {
    it('should return empty string for falsy input', () => {
      expect(formatUtils.formatRelativeTime(null)).toBe('');
      expect(formatUtils.formatRelativeTime(undefined)).toBe('');
      expect(formatUtils.formatRelativeTime(0)).toBe('');
    });

    it('should return "Just now" for recent timestamps', () => {
      const now = Date.now();
      expect(formatUtils.formatRelativeTime(now)).toBe('Just now');
      expect(formatUtils.formatRelativeTime(now - 30000)).toBe('Just now');
    });

    it('should return minutes ago', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(formatUtils.formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      expect(formatUtils.formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should return days ago', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      expect(formatUtils.formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });

    it('should return date for old timestamps', () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const result = formatUtils.formatRelativeTime(twoWeeksAgo);
      expect(result).not.toContain('ago');
    });
  });

  describe('getHostname', () => {
    it('should extract hostname from URL', () => {
      expect(formatUtils.getHostname('https://example.com/path')).toBe('example.com');
    });

    it('should remove www prefix', () => {
      expect(formatUtils.getHostname('https://www.example.com')).toBe('example.com');
    });

    it('should return input for invalid URL', () => {
      expect(formatUtils.getHostname('not-a-url')).toBe('not-a-url');
    });
  });

  describe('getInitials', () => {
    it('should return initials for name', () => {
      expect(formatUtils.getInitials('John Doe')).toBe('JD');
    });

    it('should return single initial for single name', () => {
      expect(formatUtils.getInitials('John')).toBe('J');
    });

    it('should limit to 2 initials', () => {
      expect(formatUtils.getInitials('John Michael Doe')).toBe('JM');
    });

    it('should return null for empty name', () => {
      expect(formatUtils.getInitials('')).toBe(null);
      expect(formatUtils.getInitials(null)).toBe(null);
    });

    it('should return null for numbers only', () => {
      expect(formatUtils.getInitials('+1234567890')).toBe(null);
    });
  });
});

describe('Message Utilities', () => {
  describe('cleanMessageText', () => {
    it('should remove attachment placeholder character', () => {
      expect(messageUtils.cleanMessageText('Hello \uFFFC World')).toBe('Hello  World');
    });

    it('should trim whitespace', () => {
      expect(messageUtils.cleanMessageText('  Hello  ')).toBe('Hello');
    });

    it('should return empty string for null', () => {
      expect(messageUtils.cleanMessageText(null)).toBe('');
    });

    it('should handle only placeholder characters', () => {
      expect(messageUtils.cleanMessageText('\uFFFC\uFFFC')).toBe('');
    });
  });

  describe('hasVisibleText', () => {
    it('should return true for text with content', () => {
      expect(messageUtils.hasVisibleText('Hello')).toBe(true);
    });

    it('should return false for empty text', () => {
      expect(messageUtils.hasVisibleText('')).toBe(false);
    });

    it('should return false for only placeholders', () => {
      expect(messageUtils.hasVisibleText('\uFFFC')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(messageUtils.hasVisibleText('   ')).toBe(false);
    });
  });

  describe('groupMessages', () => {
    it('should group consecutive messages from same sender', () => {
      const messages = [
        { id: 1, is_from_me: true, date: 1000 },
        { id: 2, is_from_me: true, date: 2000 },
        { id: 3, is_from_me: false, sender_name: 'Alice', date: 3000 },
      ];
      const groups = messageUtils.groupMessages(messages);
      
      expect(groups).toHaveLength(2);
      expect(groups[0].messages).toHaveLength(2);
      expect(groups[1].messages).toHaveLength(1);
    });

    it('should add time divider for large gaps', () => {
      const messages = [
        { id: 1, is_from_me: true, date: 1000 },
        { id: 2, is_from_me: true, date: 1000 + 60 * 60 * 1000 }, // 1 hour later
      ];
      const groups = messageUtils.groupMessages(messages);
      
      expect(groups.some(g => g.type === 'time')).toBe(true);
    });

    it('should return empty array for empty input', () => {
      expect(messageUtils.groupMessages([])).toEqual([]);
    });
  });

  describe('getDisplayableAttachments', () => {
    it('should filter out link previews', () => {
      const attachments = [
        { type: 'image', url: '/img.jpg' },
        { type: 'link_preview', url: '/preview' },
      ];
      const result = messageUtils.getDisplayableAttachments(attachments);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('image');
    });

    it('should filter out attachments without URL', () => {
      const attachments = [
        { type: 'image', url: '/img.jpg' },
        { type: 'image', url: null },
      ];
      const result = messageUtils.getDisplayableAttachments(attachments);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for null', () => {
      expect(messageUtils.getDisplayableAttachments(null)).toEqual([]);
    });
  });

  describe('extractMedia', () => {
    it('should extract images and videos', () => {
      const messages = [
        { id: 1, date: 1000, attachments: [{ type: 'image', url: '/img.jpg' }] },
        { id: 2, date: 2000, attachments: [{ type: 'video', url: '/vid.mp4' }] },
        { id: 3, date: 3000, attachments: [{ type: 'audio', url: '/aud.mp3' }] },
      ];
      const result = messageUtils.extractMedia(messages);
      expect(result).toHaveLength(2);
    });

    it('should include messageId', () => {
      const messages = [
        { id: 42, date: 1000, attachments: [{ type: 'image', url: '/img.jpg' }] },
      ];
      const result = messageUtils.extractMedia(messages);
      expect(result[0].messageId).toBe(42);
    });
  });

  describe('extractLinks', () => {
    it('should extract unique links', () => {
      const messages = [
        { id: 1, date: 2000, links: ['https://a.com'] },
        { id: 2, date: 1000, links: ['https://b.com', 'https://a.com'] },
      ];
      const result = messageUtils.extractLinks(messages);
      expect(result).toHaveLength(2);
    });

    it('should sort by date descending', () => {
      const messages = [
        { id: 1, date: 1000, links: ['https://old.com'] },
        { id: 2, date: 2000, links: ['https://new.com'] },
      ];
      const result = messageUtils.extractLinks(messages);
      expect(result[0].url).toBe('https://new.com');
    });
  });

  describe('detectGroupChat', () => {
    it('should detect group chat with multiple senders', () => {
      const messages = [
        { sender_name: 'Alice' },
        { sender_name: 'Bob' },
      ];
      expect(messageUtils.detectGroupChat(messages)).toBe(true);
    });

    it('should detect group chat by comma in identifier', () => {
      const messages = [
        { sender_name: 'Alice', contact_identifier: '+1234,+5678' },
      ];
      expect(messageUtils.detectGroupChat(messages)).toBe(true);
    });

    it('should not detect single sender as group', () => {
      const messages = [
        { sender_name: 'Alice' },
        { sender_name: 'Alice' },
      ];
      expect(messageUtils.detectGroupChat(messages)).toBe(false);
    });
  });
});

