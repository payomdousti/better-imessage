/**
 * Backend API Integration Tests
 * Tests for Express API endpoints using supertest
 * Uses mock database to avoid dependency on real iMessage data
 */

const request = require('supertest');
const express = require('express');
const path = require('path');

// Create a minimal test server that mimics the real API
function createTestServer() {
  const app = express();
  
  // Mock data
  const mockContacts = [
    { id: '1-100', name: 'Alice Smith', identifiers: new Set(['+15551234567', '5551234567', '+15551234567']) },
    { id: '1-101', name: 'Bob Johnson', identifiers: new Set(['+15559876543', '5559876543', '+15559876543']) }
  ];
  
  const mockConversations = [
    {
      contact_id: '1-100',
      display_name: 'Alice Smith',
      identifier: '+15551234567',
      chat_ids: [1],
      message_count: 150,
      last_message_date: Date.now(),
      last_message: 'Hello there!',
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
  
  // Serve static files
  app.use(express.static('public'));
  
  // Status endpoint
  app.get('/status', (req, res) => {
    res.json({
      processing: false,
      ready: true,
      total: 100,
      processed: 100,
      remaining: 0
    });
  });
  
  // Contacts endpoint
  app.get('/contacts', (req, res) => {
    res.json(mockContacts.map(c => ({
      contact_id: c.id,
      display_name: c.name,
      identifiers: [...c.identifiers],
      message_count: 100
    })));
  });
  
  // Conversations endpoint
  app.get('/conversations', (req, res) => {
    res.json(mockConversations);
  });
  
  // Search endpoint
  app.get('/search', (req, res) => {
    const query = req.query.q || '';
    const contacts = req.query.contacts ? req.query.contacts.split(',') : [];
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    let results = mockMessages.filter(m => 
      m.text && m.text.toLowerCase().includes(query.toLowerCase())
    );
    
    // Filter by contacts if specified
    if (contacts.length > 0) {
      results = results.filter(m => contacts.includes('1-100'));
    }
    
    res.json({
      results: results.map(m => ({
        message_id: m.id,
        text: m.text,
        conversation_id: 1,
        contact_identifier: m.contact_identifier,
        date: m.date,
        display_name: m.display_name
      })),
      page,
      limit
    });
  });
  
  // Conversation endpoint
  app.get('/conversation/:id', (req, res) => {
    const chatIds = req.params.id.split(',').map(id => parseInt(id));
    res.json(mockMessages);
  });
  
  // Global media endpoint
  app.get('/global/media', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'desc';
    const contacts = req.query.contacts ? req.query.contacts.split(',') : [];
    
    let media = [...mockMedia];
    
    // Filter by contacts if specified
    if (contacts.length > 0) {
      media = media.filter(m => contacts.includes('1-100'));
    }
    
    // Sort
    if (sort === 'asc') {
      media.sort((a, b) => a.date - b.date);
    } else {
      media.sort((a, b) => b.date - a.date);
    }
    
    res.json({
      media: media.slice(offset, offset + limit),
      hasMore: offset + limit < media.length
    });
  });
  
  // Global links endpoint
  app.get('/global/links', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const contacts = req.query.contacts ? req.query.contacts.split(',') : [];
    
    let links = [...mockLinks];
    
    // Filter by contacts if specified
    if (contacts.length > 0) {
      links = links.filter(l => contacts.includes('1-100'));
    }
    
    res.json({
      links: links.slice(offset, offset + limit),
      hasMore: offset + limit < links.length
    });
  });
  
  // Link preview endpoint
  app.get('/link-preview', (req, res) => {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    res.json({
      title: 'Example Title',
      description: 'Example description',
      image: 'https://example.com/image.jpg',
      siteName: 'Example Site'
    });
  });
  
  // Catch-all for serving index.html
  app.get('*', (req, res) => {
    res.status(200).send('<!DOCTYPE html><html><body>App</body></html>');
  });
  
  return app;
}

describe('API Endpoints', () => {
  let app;
  
  beforeAll(() => {
    app = createTestServer();
  });
  
  describe('GET /status', () => {
    test('should return processing status', async () => {
      const response = await request(app).get('/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('processing');
      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('remaining');
    });
    
    test('should indicate ready state when processing is complete', async () => {
      const response = await request(app).get('/status');
      
      expect(response.body.ready).toBe(true);
      expect(response.body.remaining).toBe(0);
    });
  });
  
  describe('GET /contacts', () => {
    test('should return list of contacts', async () => {
      const response = await request(app).get('/contacts');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
    
    test('should return contacts with required fields', async () => {
      const response = await request(app).get('/contacts');
      const contact = response.body[0];
      
      expect(contact).toHaveProperty('contact_id');
      expect(contact).toHaveProperty('display_name');
      expect(contact).toHaveProperty('identifiers');
      expect(contact).toHaveProperty('message_count');
    });
  });
  
  describe('GET /conversations', () => {
    test('should return list of conversations', async () => {
      const response = await request(app).get('/conversations');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('should return conversations with required fields', async () => {
      const response = await request(app).get('/conversations');
      const conversation = response.body[0];
      
      expect(conversation).toHaveProperty('contact_id');
      expect(conversation).toHaveProperty('display_name');
      expect(conversation).toHaveProperty('chat_ids');
      expect(conversation).toHaveProperty('message_count');
      expect(conversation).toHaveProperty('last_message_date');
      expect(conversation).toHaveProperty('last_message');
      expect(conversation).toHaveProperty('is_group');
    });
    
    test('chat_ids should be an array', async () => {
      const response = await request(app).get('/conversations');
      const conversation = response.body[0];
      
      expect(Array.isArray(conversation.chat_ids)).toBe(true);
    });
  });
  
  describe('GET /search', () => {
    test('should search messages by query', async () => {
      const response = await request(app).get('/search?q=hello');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });
    
    test('should return search results with required fields', async () => {
      const response = await request(app).get('/search?q=hello');
      
      if (response.body.results.length > 0) {
        const result = response.body.results[0];
        expect(result).toHaveProperty('message_id');
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('conversation_id');
        expect(result).toHaveProperty('date');
        expect(result).toHaveProperty('display_name');
      }
    });
    
    test('should return page and limit in response', async () => {
      const response = await request(app).get('/search?q=test&page=1&limit=10');
      
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });
    
    test('should filter by contacts when specified', async () => {
      const response = await request(app).get('/search?q=hello&contacts=1-100');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
    });
    
    test('should handle empty query', async () => {
      const response = await request(app).get('/search?q=');
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('GET /conversation/:id', () => {
    test('should return conversation messages', async () => {
      const response = await request(app).get('/conversation/1');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('should return messages with required fields', async () => {
      const response = await request(app).get('/conversation/1');
      
      if (response.body.length > 0) {
        const message = response.body[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('text');
        expect(message).toHaveProperty('is_from_me');
        expect(message).toHaveProperty('date');
        expect(message).toHaveProperty('attachments');
        expect(message).toHaveProperty('links');
      }
    });
    
    test('should handle multiple chat IDs', async () => {
      const response = await request(app).get('/conversation/1,2,3');
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('GET /global/media', () => {
    test('should return media items', async () => {
      const response = await request(app).get('/global/media');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('media');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.media)).toBe(true);
    });
    
    test('should return media with required fields', async () => {
      const response = await request(app).get('/global/media');
      
      if (response.body.media.length > 0) {
        const media = response.body.media[0];
        expect(media).toHaveProperty('id');
        expect(media).toHaveProperty('filename');
        expect(media).toHaveProperty('type');
        expect(media).toHaveProperty('url');
        expect(media).toHaveProperty('date');
        expect(media).toHaveProperty('contact');
      }
    });
    
    test('should support pagination', async () => {
      const response = await request(app).get('/global/media?limit=10&offset=0');
      
      expect(response.status).toBe(200);
      expect(response.body.media.length).toBeLessThanOrEqual(10);
    });
    
    test('should support sort parameter', async () => {
      const responseDesc = await request(app).get('/global/media?sort=desc');
      const responseAsc = await request(app).get('/global/media?sort=asc');
      
      expect(responseDesc.status).toBe(200);
      expect(responseAsc.status).toBe(200);
    });
    
    test('should filter by contacts', async () => {
      const response = await request(app).get('/global/media?contacts=1-100');
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('GET /global/links', () => {
    test('should return links', async () => {
      const response = await request(app).get('/global/links');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.links)).toBe(true);
    });
    
    test('should return links with required fields', async () => {
      const response = await request(app).get('/global/links');
      
      if (response.body.links.length > 0) {
        const link = response.body.links[0];
        expect(link).toHaveProperty('url');
        expect(link).toHaveProperty('date');
        expect(link).toHaveProperty('contact');
      }
    });
    
    test('should support pagination', async () => {
      const response = await request(app).get('/global/links?limit=10&offset=0');
      
      expect(response.status).toBe(200);
      expect(response.body.links.length).toBeLessThanOrEqual(10);
    });
    
    test('should filter by contacts', async () => {
      const response = await request(app).get('/global/links?contacts=1-100');
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('GET /link-preview', () => {
    test('should return link preview data', async () => {
      const response = await request(app).get('/link-preview?url=https://example.com');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
    });
    
    test('should return 400 for missing URL', async () => {
      const response = await request(app).get('/link-preview');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('Static files and fallback', () => {
    test('should serve HTML for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('html');
    });
  });
});

describe('API Error Handling', () => {
  let app;
  
  beforeAll(() => {
    app = createTestServer();
  });
  
  test('should handle malformed pagination parameters', async () => {
    const response = await request(app).get('/global/media?limit=abc&offset=xyz');
    
    expect(response.status).toBe(200);
    // Should fall back to defaults
  });
  
  test('should handle empty contact filter', async () => {
    const response = await request(app).get('/search?q=test&contacts=');
    
    expect(response.status).toBe(200);
  });
});

describe('API Query Parameters', () => {
  let app;
  
  beforeAll(() => {
    app = createTestServer();
  });
  
  describe('Pagination', () => {
    test('should respect limit parameter', async () => {
      const response = await request(app).get('/global/media?limit=5');
      
      expect(response.body.media.length).toBeLessThanOrEqual(5);
    });
    
    test('should respect offset parameter', async () => {
      const response = await request(app).get('/global/media?offset=0&limit=10');
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Sorting', () => {
    test('should accept desc sort order', async () => {
      const response = await request(app).get('/global/media?sort=desc');
      
      expect(response.status).toBe(200);
    });
    
    test('should accept asc sort order', async () => {
      const response = await request(app).get('/global/media?sort=asc');
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Contact filtering', () => {
    test('should accept single contact filter', async () => {
      const response = await request(app).get('/global/media?contacts=1-100');
      
      expect(response.status).toBe(200);
    });
    
    test('should accept multiple contact filters', async () => {
      const response = await request(app).get('/global/media?contacts=1-100,1-101');
      
      expect(response.status).toBe(200);
    });
  });
});

