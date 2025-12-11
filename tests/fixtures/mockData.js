/**
 * Mock Data Fixtures for Testing
 * Contains synthetic test data - no real user data
 */

// Mock contacts
export const mockContacts = [
  {
    contact_id: '1-100',
    display_name: 'Alice Smith',
    identifiers: ['+15551234567', '5551234567', 'alice@example.com'],
    message_count: 150
  },
  {
    contact_id: '1-101',
    display_name: 'Bob Johnson',
    identifiers: ['+15559876543', '5559876543'],
    message_count: 75
  },
  {
    contact_id: '1-102',
    display_name: 'Charlie Brown',
    identifiers: ['charlie@example.com'],
    message_count: 30
  },
  {
    contact_id: 'group-200',
    display_name: 'Family Group',
    identifiers: ['+15551111111', '+15552222222', '+15553333333'],
    message_count: 500,
    is_group: true
  }
];

// Mock conversations
export const mockConversations = [
  {
    contact_id: '1-100',
    display_name: 'Alice Smith',
    identifier: '+15551234567',
    chat_ids: [1, 5],
    message_count: 150,
    last_message_date: Date.now() - 3600000, // 1 hour ago
    last_message: 'See you tomorrow!',
    is_group: false
  },
  {
    contact_id: '1-101',
    display_name: 'Bob Johnson',
    identifier: '+15559876543',
    chat_ids: [2],
    message_count: 75,
    last_message_date: Date.now() - 86400000, // 1 day ago
    last_message: 'Sounds good to me',
    is_group: false
  },
  {
    contact_id: 'group-200',
    display_name: 'Family Group',
    identifier: '+15551111111, +15552222222',
    chat_ids: [10],
    message_count: 500,
    last_message_date: Date.now() - 7200000, // 2 hours ago
    last_message: 'Happy birthday!',
    is_group: true
  }
];

// Mock messages
export const mockMessages = [
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
    text: "I'm doing great, thanks for asking!",
    is_from_me: true,
    date: Date.now() - 86300000,
    contact_identifier: '+15551234567',
    display_name: 'Alice Smith',
    sender_name: 'You',
    attachments: [],
    links: []
  },
  {
    id: 1003,
    text: 'Check out this link: https://example.com/article',
    is_from_me: false,
    date: Date.now() - 86200000,
    contact_identifier: '+15551234567',
    display_name: 'Alice Smith',
    sender_name: 'Alice Smith',
    attachments: [],
    links: ['https://example.com/article']
  },
  {
    id: 1004,
    text: null,
    is_from_me: true,
    date: Date.now() - 86100000,
    contact_identifier: '+15551234567',
    display_name: 'Alice Smith',
    sender_name: 'You',
    attachments: [
      {
        id: 5001,
        filename: 'photo.jpg',
        mime_type: 'image/jpeg',
        type: 'image',
        url: '/attachment/5001',
        thumbUrl: '/thumb/5001'
      }
    ],
    links: []
  }
];

// Mock search results
export const mockSearchResults = {
  results: [
    {
      message_id: 1001,
      text: 'Hello, how are you?',
      conversation_id: 1,
      contact_identifier: '+15551234567',
      date: Date.now() - 86400000,
      display_name: 'Alice Smith'
    },
    {
      message_id: 2001,
      text: 'Hello there!',
      conversation_id: 2,
      contact_identifier: '+15559876543',
      date: Date.now() - 172800000,
      display_name: 'Bob Johnson'
    }
  ],
  page: 1,
  limit: 20,
  total: 2
};

// Mock media items
export const mockMedia = [
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
    message_id: 1004
  },
  {
    id: 5002,
    filename: 'video1.mov',
    type: 'video',
    url: '/attachment/5002',
    thumbUrl: '/thumb/5002',
    date: Date.now() - 172800000,
    contact: 'Bob Johnson',
    is_from_me: true,
    chat_id: 2,
    message_id: 2005
  },
  {
    id: 5003,
    filename: 'photo2.heic',
    type: 'image',
    url: '/attachment/5003',
    thumbUrl: '/thumb/5003',
    date: Date.now() - 259200000,
    contact: 'Alice Smith',
    is_from_me: false,
    chat_id: 1,
    message_id: 1010
  }
];

// Mock links
export const mockLinks = [
  {
    url: 'https://example.com/article1',
    date: Date.now() - 86400000,
    contact: 'Alice Smith',
    is_from_me: false
  },
  {
    url: 'https://github.com/user/repo',
    date: Date.now() - 172800000,
    contact: 'Bob Johnson',
    is_from_me: true
  },
  {
    url: 'https://youtube.com/watch?v=test123',
    date: Date.now() - 259200000,
    contact: 'Charlie Brown',
    is_from_me: false
  }
];

// Mock link preview
export const mockLinkPreview = {
  title: 'Example Article Title',
  description: 'This is a description of the article content.',
  image: 'https://example.com/image.jpg',
  siteName: 'Example Site'
};

// Mock attributedBody buffer for testing extraction
export const mockAttributedBody = {
  // Simple message: "Hello world" (length 11 = 0x0b)
  simple: Buffer.from([
    0x04, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x74, 0x79, 0x70, 0x65, 0x64,
    0x81, 0xe8, 0x03, 0x84, 0x01, 0x40, 0x84, 0x84, 0x84, 0x12, 0x4e, 0x53, 0x41,
    0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x64, 0x53, 0x74, 0x72, 0x69,
    0x6e, 0x67, 0x00, 0x84, 0x84, 0x08, 0x4e, 0x53, 0x4f, 0x62, 0x6a, 0x65, 0x63,
    0x74, 0x00, 0x85, 0x92, 0x84, 0x84, 0x84, 0x08, 0x4e, 0x53, 0x53, 0x74, 0x72,
    0x69, 0x6e, 0x67, 0x01, 0x94, 0x84, 0x01, 0x2b, 0x0b, 0x48, 0x65, 0x6c, 0x6c,
    0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x86
  ]),
  
  // Multi-byte length message (length > 127)
  multiByte: Buffer.from([
    0x04, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x74, 0x79, 0x70, 0x65, 0x64,
    0x81, 0xe8, 0x03, 0x84, 0x01, 0x40, 0x84, 0x84, 0x84, 0x12, 0x4e, 0x53, 0x41,
    0x74, 0x74, 0x72, 0x69, 0x62, 0x75, 0x74, 0x65, 0x64, 0x53, 0x74, 0x72, 0x69,
    0x6e, 0x67, 0x00, 0x84, 0x84, 0x08, 0x4e, 0x53, 0x4f, 0x62, 0x6a, 0x65, 0x63,
    0x74, 0x00, 0x85, 0x92, 0x84, 0x84, 0x84, 0x08, 0x4e, 0x53, 0x53, 0x74, 0x72,
    0x69, 0x6e, 0x67, 0x01, 0x94, 0x84, 0x01, 0x2b, 0x81, 0x14, 0x00, 0x54, 0x68,
    0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x74, 0x65, 0x73, 0x74, 0x20,
    0x6d, 0x73, 0x67, 0x86
  ])
};

// Mock processing status
export const mockProcessingStatus = {
  processing: false,
  ready: true,
  total: 100,
  processed: 100,
  remaining: 0
};

// Phone number test cases
export const phoneTestCases = [
  { input: '+1 (555) 123-4567', expected: '5551234567' },
  { input: '+15551234567', expected: '5551234567' },
  { input: '555-123-4567', expected: '5551234567' },
  { input: '5551234567', expected: '5551234567' },
  { input: '1-555-123-4567', expected: '5551234567' },
  { input: '(555) 123 4567', expected: '5551234567' },
  { input: '+44 20 7946 0958', expected: '2079460958' },
  { input: null, expected: null },
  { input: '', expected: null },
  { input: '123', expected: null } // Too short
];

// Email test cases
export const emailTestCases = [
  { input: 'TEST@EXAMPLE.COM', expected: 'test@example.com' },
  { input: 'User.Name@Domain.Com', expected: 'user.name@domain.com' },
  { input: 'simple@test.org', expected: 'simple@test.org' },
  { input: null, expected: null },
  { input: '', expected: null }
];

// Mac time test cases (nanoseconds since 2001-01-01)
export const macTimeTestCases = [
  { input: 0, expected: 978307200000 }, // 2001-01-01 00:00:00 UTC
  { input: 1000000000000000000, expected: 1978307200000 }, // ~2032
  { input: null, expected: null }
];

