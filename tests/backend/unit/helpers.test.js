/**
 * Backend Helper Functions Unit Tests
 * Tests for utility functions in server modules
 */

// Import from actual modules
const { normalizePhone, normalizeEmail } = require('../../../server/helpers/phone');
const { convertMacTime } = require('../../../server/helpers/time');
const { extractTextFromAttributedBody, getMessageText, extractUrls } = require('../../../server/helpers/text');
const { getAttachmentType, expandPath } = require('../../../server/helpers/attachments');
const os = require('os');
const path = require('path');

describe('Helper Functions', () => {
  describe('normalizePhone', () => {
    test('should normalize US phone with country code and formatting', () => {
      expect(normalizePhone('+1 (555) 123-4567')).toBe('5551234567');
    });

    test('should normalize US phone with country code no formatting', () => {
      expect(normalizePhone('+15551234567')).toBe('5551234567');
    });

    test('should normalize phone with dashes', () => {
      expect(normalizePhone('555-123-4567')).toBe('5551234567');
    });

    test('should normalize plain 10-digit phone', () => {
      expect(normalizePhone('5551234567')).toBe('5551234567');
    });

    test('should normalize phone with 1 prefix', () => {
      expect(normalizePhone('1-555-123-4567')).toBe('5551234567');
    });

    test('should normalize phone with spaces and parentheses', () => {
      expect(normalizePhone('(555) 123 4567')).toBe('5551234567');
    });

    test('should handle international numbers', () => {
      expect(normalizePhone('+44 20 7946 0958')).toBe('2079460958');
    });

    test('should return empty string for null input', () => {
      expect(normalizePhone(null)).toBe('');
    });

    test('should return empty string for empty string input', () => {
      expect(normalizePhone('')).toBe('');
    });

    test('should return empty string for too short number', () => {
      expect(normalizePhone('123')).toBe('');
    });

    test('should return empty string for 5-digit number', () => {
      expect(normalizePhone('55512')).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(normalizePhone(undefined)).toBe('');
    });

    test('should handle longer international numbers by taking last 10 digits', () => {
      expect(normalizePhone('+44 20 7946 0958 123')).toBe('9460958123');
    });
  });

  describe('normalizeEmail', () => {
    test('should lowercase email', () => {
      expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    test('should handle mixed case', () => {
      expect(normalizeEmail('User.Name@Domain.Com')).toBe('user.name@domain.com');
    });

    test('should preserve already lowercase email', () => {
      expect(normalizeEmail('simple@test.org')).toBe('simple@test.org');
    });

    test('should trim whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    test('should return empty string for null input', () => {
      expect(normalizeEmail(null)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('convertMacTime', () => {
    const MAC_EPOCH_MS = 978307200000;

    test('should convert zero to Mac epoch', () => {
      expect(convertMacTime(0)).toBe(MAC_EPOCH_MS);
    });

    test('should convert nanoseconds to milliseconds correctly', () => {
      const result = convertMacTime(1000000000000000000);
      expect(result).toBe(1978307200000);
    });

    test('should return null for null input', () => {
      expect(convertMacTime(null)).toBeNull();
    });

    test('should return null for undefined', () => {
      expect(convertMacTime(undefined)).toBeNull();
    });

    test('should handle typical iMessage timestamp', () => {
      const macTime = 700000000000000000;
      const result = convertMacTime(macTime);
      expect(result).toBeGreaterThan(978307200000);
      expect(result).toBeLessThan(Date.now() + 86400000);
    });
  });

  describe('extractTextFromAttributedBody', () => {
    test('should extract simple message text', () => {
      const buffer = Buffer.from([
        0x04, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x74, 0x79, 0x70, 0x65, 0x64,
        0x81, 0xe8, 0x03, 0x84, 0x01, 0x40, 0x84, 0x84, 0x84, 0x12, 0x4e, 0x53, 0x41,
        0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x64, 0x53, 0x74, 0x72, 0x69,
        0x6e, 0x67, 0x00, 0x84, 0x84, 0x08, 0x4e, 0x53, 0x4f, 0x62, 0x6a, 0x65, 0x63,
        0x74, 0x00, 0x85, 0x92, 0x84, 0x84, 0x84, 0x08, 0x4e, 0x53, 0x53, 0x74, 0x72,
        0x69, 0x6e, 0x67, 0x01, 0x94, 0x84, 0x01, 0x2b, 0x05, 0x48, 0x65, 0x6c, 0x6c,
        0x6f, 0x86
      ]);
      
      expect(extractTextFromAttributedBody(buffer)).toBe('Hello');
    });

    test('should return null for null input', () => {
      expect(extractTextFromAttributedBody(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(extractTextFromAttributedBody(undefined)).toBeNull();
    });

    test('should return null for empty buffer', () => {
      expect(extractTextFromAttributedBody(Buffer.from([]))).toBeNull();
    });

    test('should return null for buffer without NSString marker', () => {
      const buffer = Buffer.from('random data without marker');
      expect(extractTextFromAttributedBody(buffer)).toBeNull();
    });
  });

  describe('getMessageText', () => {
    test('should return text if present', () => {
      const row = { text: 'Hello world', attributedBody: null };
      expect(getMessageText(row)).toBe('Hello world');
    });

    test('should return null for empty text and no attributedBody', () => {
      const row = { text: '', attributedBody: null };
      expect(getMessageText(row)).toBeNull();
    });

    test('should return null for whitespace-only text and no attributedBody', () => {
      const row = { text: '   ', attributedBody: null };
      expect(getMessageText(row)).toBeNull();
    });

    test('should return null for null text and null attributedBody', () => {
      const row = { text: null, attributedBody: null };
      expect(getMessageText(row)).toBeNull();
    });
  });

  describe('extractUrls', () => {
    test('should extract single URL', () => {
      const text = 'Check out https://example.com';
      expect(extractUrls(text)).toEqual(['https://example.com']);
    });

    test('should extract multiple URLs', () => {
      const text = 'Visit https://example.com and http://test.org';
      expect(extractUrls(text)).toEqual(['https://example.com', 'http://test.org']);
    });

    test('should deduplicate URLs', () => {
      const text = 'https://example.com and https://example.com again';
      expect(extractUrls(text)).toEqual(['https://example.com']);
    });

    test('should handle URLs with paths and query params', () => {
      const text = 'Link: https://example.com/path?param=value&other=123';
      expect(extractUrls(text)).toEqual(['https://example.com/path?param=value&other=123']);
    });

    test('should return empty array for null', () => {
      expect(extractUrls(null)).toEqual([]);
    });

    test('should return empty array for empty string', () => {
      expect(extractUrls('')).toEqual([]);
    });

    test('should return empty array for text without URLs', () => {
      expect(extractUrls('No links here!')).toEqual([]);
    });
  });

  describe('getAttachmentType', () => {
    test('should detect image by mime type', () => {
      expect(getAttachmentType('image/jpeg', 'file.bin')).toBe('image');
      expect(getAttachmentType('image/png', 'file.bin')).toBe('image');
      expect(getAttachmentType('image/gif', 'file.bin')).toBe('image');
    });

    test('should detect image by filename', () => {
      expect(getAttachmentType('', 'photo.jpg')).toBe('image');
      expect(getAttachmentType('', 'photo.JPEG')).toBe('image');
      expect(getAttachmentType('', 'photo.png')).toBe('image');
      expect(getAttachmentType('', 'photo.heic')).toBe('image');
    });

    test('should detect video by mime type', () => {
      expect(getAttachmentType('video/mp4', 'file.bin')).toBe('video');
      expect(getAttachmentType('video/quicktime', 'file.bin')).toBe('video');
    });

    test('should detect video by filename', () => {
      expect(getAttachmentType('', 'video.mov')).toBe('video');
      expect(getAttachmentType('', 'video.mp4')).toBe('video');
      expect(getAttachmentType('', 'video.m4v')).toBe('video');
    });

    test('should detect audio by mime type', () => {
      expect(getAttachmentType('audio/mpeg', 'file.bin')).toBe('audio');
      expect(getAttachmentType('audio/mp4', 'file.bin')).toBe('audio');
    });

    test('should detect audio by filename', () => {
      expect(getAttachmentType('', 'audio.mp3')).toBe('audio');
      expect(getAttachmentType('', 'audio.m4a')).toBe('audio');
      expect(getAttachmentType('', 'audio.wav')).toBe('audio');
    });

    test('should return other for unknown types', () => {
      expect(getAttachmentType('application/pdf', 'doc.pdf')).toBe('other');
      expect(getAttachmentType('', 'document.docx')).toBe('other');
      expect(getAttachmentType(null, null)).toBe('other');
    });
    
    test('should detect link_preview for pluginpayloadattachment', () => {
      expect(getAttachmentType('', 'pluginPayloadAttachment123.bin')).toBe('link_preview');
    });
  });

  describe('expandPath', () => {
    test('should expand tilde path', () => {
      const result = expandPath('~/Documents/file.txt');
      expect(result).toBe(path.join(os.homedir(), 'Documents/file.txt'));
    });

    test('should leave absolute path unchanged', () => {
      expect(expandPath('/usr/local/bin')).toBe('/usr/local/bin');
    });

    test('should leave relative path unchanged', () => {
      expect(expandPath('relative/path')).toBe('relative/path');
    });

    test('should return null for null input', () => {
      expect(expandPath(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(expandPath(undefined)).toBeNull();
    });
  });
});

describe('Contact Grouping Logic', () => {
  describe('Contact ID generation', () => {
    test('should create consistent contact IDs', () => {
      const dbIndex = 'source-abc';
      const recordId = 1962;
      const contactId = `${dbIndex}-${recordId}`;
      expect(contactId).toBe('source-abc-1962');
    });

    test('should handle group chat IDs', () => {
      const chatId = 200;
      const groupContactId = `group-${chatId}`;
      expect(groupContactId).toBe('group-200');
    });
  });

  describe('Phone format variations', () => {
    test('should match different formats of same number', () => {
      const formats = [
        '+1 (555) 123-4567',
        '+15551234567',
        '555-123-4567',
        '(555) 123-4567',
        '1-555-123-4567'
      ];
      
      const normalized = formats.map(normalizePhone);
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('5551234567');
    });
  });
});
