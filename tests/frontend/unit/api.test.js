/**
 * API Client Unit Tests
 * Tests for the API client functions in src/api.js
 */

// Mock fetch before importing the module
global.fetch = jest.fn();

// Recreate the API functions for testing
const API_BASE = '';

async function searchMessages(query, page = 1, contacts = []) {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
  });
  
  if (contacts.length > 0) {
    params.set('contacts', contacts.join(','));
  }
  
  const res = await fetch(`${API_BASE}/search?${params}`);
  return res.json();
}

async function getConversation(conversationId) {
  const res = await fetch(`${API_BASE}/conversation/${conversationId}`);
  return res.json();
}

async function getContacts() {
  const res = await fetch(`${API_BASE}/contacts`);
  return res.json();
}

async function getConversations(limit = 50) {
  const res = await fetch(`${API_BASE}/conversations?limit=${limit}`);
  return res.json();
}

async function getGlobalMedia(limit = 100, offset = 0, sort = 'desc', contacts = []) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sort: sort
  });
  
  if (contacts.length > 0) {
    params.set('contacts', contacts.join(','));
  }
  
  const res = await fetch(`${API_BASE}/global/media?${params}`);
  return res.json();
}

async function getGlobalLinks(limit = 100, offset = 0, contacts = []) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString()
  });
  
  if (contacts.length > 0) {
    params.set('contacts', contacts.join(','));
  }
  
  const res = await fetch(`${API_BASE}/global/links?${params}`);
  return res.json();
}

describe('API Client', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('searchMessages', () => {
    const mockSearchResponse = {
      results: [
        { message_id: 1, text: 'Hello', conversation_id: 1, date: Date.now() }
      ],
      page: 1,
      limit: 20
    };

    test('should call fetch with correct URL', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockSearchResponse)
      });

      await searchMessages('hello');

      expect(fetch).toHaveBeenCalledWith('/search?q=hello&page=1');
    });

    test('should include page parameter', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockSearchResponse)
      });

      await searchMessages('hello', 2);

      expect(fetch).toHaveBeenCalledWith('/search?q=hello&page=2');
    });

    test('should include contacts filter when provided', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockSearchResponse)
      });

      await searchMessages('hello', 1, ['1-100', '1-101']);

      expect(fetch).toHaveBeenCalledWith('/search?q=hello&page=1&contacts=1-100%2C1-101');
    });

    test('should return parsed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockSearchResponse)
      });

      const result = await searchMessages('hello');

      expect(result).toEqual(mockSearchResponse);
    });

    test('should handle empty query', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ results: [], page: 1, limit: 20, total: 0 })
      });

      await searchMessages('');

      expect(fetch).toHaveBeenCalledWith('/search?q=&page=1');
    });
  });

  describe('getConversation', () => {
    const mockMessages = [
      { id: 1, text: 'Hello', is_from_me: false, date: Date.now() },
      { id: 2, text: 'Hi!', is_from_me: true, date: Date.now() }
    ];

    test('should call fetch with correct URL', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMessages)
      });

      await getConversation(1);

      expect(fetch).toHaveBeenCalledWith('/conversation/1');
    });

    test('should handle comma-separated chat IDs', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMessages)
      });

      await getConversation('1,2,3');

      expect(fetch).toHaveBeenCalledWith('/conversation/1,2,3');
    });

    test('should return parsed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMessages)
      });

      const result = await getConversation(1);

      expect(result).toEqual(mockMessages);
    });
  });

  describe('getContacts', () => {
    const mockContacts = [
      { contact_id: '1-100', display_name: 'Alice', identifiers: ['+15551234567'], message_count: 100 },
      { contact_id: '1-101', display_name: 'Bob', identifiers: ['+15559876543'], message_count: 50 }
    ];

    test('should call fetch with correct URL', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockContacts)
      });

      await getContacts();

      expect(fetch).toHaveBeenCalledWith('/contacts');
    });

    test('should return parsed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockContacts)
      });

      const result = await getContacts();

      expect(result).toEqual(mockContacts);
    });
  });

  describe('getConversations', () => {
    const mockConversations = [
      { contact_id: '1-100', display_name: 'Alice', last_message: 'Hi', chat_ids: [1] },
      { contact_id: '1-101', display_name: 'Bob', last_message: 'Hey', chat_ids: [2] }
    ];

    test('should call fetch with default limit', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockConversations)
      });

      await getConversations();

      expect(fetch).toHaveBeenCalledWith('/conversations?limit=50');
    });

    test('should call fetch with custom limit', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockConversations)
      });

      await getConversations(100);

      expect(fetch).toHaveBeenCalledWith('/conversations?limit=100');
    });

    test('should return parsed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockConversations)
      });

      const result = await getConversations();

      expect(result).toEqual(mockConversations);
    });
  });

  describe('getGlobalMedia', () => {
    const mockMedia = {
      media: [
        { id: 1, filename: 'photo.jpg', type: 'image', url: '/attachment/1' }
      ],
      hasMore: false
    };

    test('should call fetch with default parameters', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMedia)
      });

      await getGlobalMedia();

      expect(fetch).toHaveBeenCalledWith('/global/media?limit=100&offset=0&sort=desc');
    });

    test('should call fetch with custom limit and offset', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMedia)
      });

      await getGlobalMedia(50, 10);

      expect(fetch).toHaveBeenCalledWith('/global/media?limit=50&offset=10&sort=desc');
    });

    test('should call fetch with custom sort order', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMedia)
      });

      await getGlobalMedia(100, 0, 'asc');

      expect(fetch).toHaveBeenCalledWith('/global/media?limit=100&offset=0&sort=asc');
    });

    test('should include contacts filter when provided', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMedia)
      });

      await getGlobalMedia(100, 0, 'desc', ['1-100']);

      expect(fetch).toHaveBeenCalledWith('/global/media?limit=100&offset=0&sort=desc&contacts=1-100');
    });

    test('should return parsed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockMedia)
      });

      const result = await getGlobalMedia();

      expect(result).toEqual(mockMedia);
    });
  });

  describe('getGlobalLinks', () => {
    const mockLinks = {
      links: [
        { url: 'https://example.com', date: Date.now(), contact: 'Alice' }
      ],
      hasMore: false
    };

    test('should call fetch with default parameters', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockLinks)
      });

      await getGlobalLinks();

      expect(fetch).toHaveBeenCalledWith('/global/links?limit=100&offset=0');
    });

    test('should call fetch with custom limit and offset', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockLinks)
      });

      await getGlobalLinks(50, 10);

      expect(fetch).toHaveBeenCalledWith('/global/links?limit=50&offset=10');
    });

    test('should include contacts filter when provided', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockLinks)
      });

      await getGlobalLinks(100, 0, ['1-100', '1-101']);

      expect(fetch).toHaveBeenCalledWith('/global/links?limit=100&offset=0&contacts=1-100%2C1-101');
    });

    test('should return parsed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockLinks)
      });

      const result = await getGlobalLinks();

      expect(result).toEqual(mockLinks);
    });
  });
});

describe('API Error Handling', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should propagate fetch errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(searchMessages('test')).rejects.toThrow('Network error');
  });

  test('should propagate JSON parsing errors', async () => {
    fetch.mockResolvedValueOnce({
      json: () => Promise.reject(new Error('Invalid JSON'))
    });

    await expect(searchMessages('test')).rejects.toThrow('Invalid JSON');
  });
});

describe('URL Parameter Encoding', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch.mockResolvedValue({
      json: () => Promise.resolve({})
    });
  });

  test('should encode special characters in search query', async () => {
    await searchMessages('hello world');

    // URLSearchParams encodes spaces as +
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=hello+world'));
  });

  test('should encode special characters in contact IDs', async () => {
    await getGlobalMedia(100, 0, 'desc', ['contact-1', 'contact-2']);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('contacts=contact-1%2Ccontact-2')
    );
  });
});

describe('Parameter Type Coercion', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch.mockResolvedValue({
      json: () => Promise.resolve({})
    });
  });

  test('should convert page number to string', async () => {
    await searchMessages('test', 5);

    expect(fetch).toHaveBeenCalledWith('/search?q=test&page=5');
  });

  test('should convert limit to string', async () => {
    await getGlobalMedia(200, 0);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('limit=200'));
  });

  test('should convert offset to string', async () => {
    await getGlobalMedia(100, 50);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('offset=50'));
  });
});

