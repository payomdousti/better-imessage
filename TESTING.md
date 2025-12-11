# Testing Guide

This document describes the test suite for the iMessage Search App.

## Overview

The test suite includes:
- **Backend Unit Tests**: Testing helper functions, utilities, and data transformations
- **Backend Integration Tests**: Testing Express API endpoints with mock data
- **Frontend Unit Tests**: Testing React components in isolation
- **Frontend Integration Tests**: Testing component interactions and state management
- **API Client Tests**: Testing the fetch API wrapper functions

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Test Structure

```
tests/
├── backend/
│   ├── unit/
│   │   └── helpers.test.js      # Helper function tests
│   └── integration/
│       └── api.test.js          # API endpoint tests
├── frontend/
│   ├── unit/
│   │   ├── components.test.js   # Component tests
│   │   └── api.test.js          # API client tests
│   └── integration/
│       └── app.test.js          # App integration tests
├── fixtures/
│   └── mockData.js              # Shared mock data
├── mocks/                        # Mock modules
└── setup/
    ├── backend.setup.js         # Backend test configuration
    └── frontend.setup.js        # Frontend test configuration
```

## Test Categories

### Backend Unit Tests (`tests/backend/unit/`)

Tests for pure functions and utilities:
- `normalizePhone()` - Phone number normalization
- `normalizeEmail()` - Email normalization  
- `convertMacTime()` - Mac timestamp conversion
- `extractTextFromAttributedBody()` - Binary plist text extraction
- `getMessageText()` - Message text retrieval with fallback
- `extractUrls()` - URL extraction from text
- `getAttachmentType()` - Attachment type detection
- `expandPath()` - Path expansion (~/ handling)
- Contact ID generation and grouping logic

### Backend Integration Tests (`tests/backend/integration/`)

Tests for API endpoints using supertest:
- `GET /status` - Processing status
- `GET /contacts` - Contact list
- `GET /conversations` - Conversation list
- `GET /search` - Message search with filters
- `GET /conversation/:id` - Conversation messages
- `GET /global/media` - Global media with pagination/sorting
- `GET /global/links` - Global links with pagination
- `GET /link-preview` - Link preview fetching

### Frontend Unit Tests (`tests/frontend/unit/`)

Tests for React components:
- `SearchBar` - Search input behavior
- `ConversationItem` - Conversation list items
- `Message` - Message display and styling
- `MediaItem` - Media thumbnail display
- `SortToggle` - Sort order toggle
- `MainTab` - Tab navigation
- `ProcessingStatus` - Processing indicator
- `LinkPreviewCard` - Link preview cards
- `MediaGallery` - Full-screen media viewer
- Utility functions (formatRelativeTime)

### Frontend Integration Tests (`tests/frontend/integration/`)

Tests for component interactions:
- Initial data loading
- Tab navigation
- Search functionality
- Conversation selection
- Contact filtering
- State management
- Loading states

### API Client Tests (`tests/frontend/unit/api.test.js`)

Tests for the fetch wrapper functions:
- Parameter construction
- URL encoding
- Error propagation
- Response parsing

## Mock Data

All tests use synthetic mock data from `tests/fixtures/mockData.js`. **No real user data is included in the test suite.**

Mock data includes:
- Contacts with fake names and phone numbers
- Conversations with placeholder messages
- Media items with fake filenames
- Link previews with example URLs
- AttributedBody buffers for text extraction testing

## Writing New Tests

### Adding Backend Tests

```javascript
// tests/backend/unit/myFeature.test.js
describe('My Feature', () => {
  test('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Adding Frontend Tests

```javascript
// tests/frontend/unit/MyComponent.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  test('should render correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });
});
```

### Adding Integration Tests

```javascript
// tests/backend/integration/myEndpoint.test.js
const request = require('supertest');

describe('GET /my-endpoint', () => {
  test('should return expected data', async () => {
    const response = await request(app).get('/my-endpoint');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mock External Dependencies**: Use mocks for database, network, and filesystem operations
3. **Descriptive Names**: Test names should describe the expected behavior
4. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
5. **No Real Data**: Never include real user data in tests
6. **Fast Execution**: Keep tests fast by mocking slow operations

## Continuous Integration

Run tests before committing:
```bash
npm test && npm run build
```

The test suite is designed to catch regressions after any changes. Run the full suite after modifying:
- Helper functions in `server.js`
- API endpoints
- React components
- API client functions

## Troubleshooting

### Tests Failing After Dependency Updates

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules && npm install
```

### Mock Not Working

Ensure mocks are set up before the module is imported:
```javascript
jest.mock('../path/to/module');
// Then import the component that uses it
import Component from '../component';
```

### Async Test Timeout

Increase timeout for slow tests:
```javascript
test('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

