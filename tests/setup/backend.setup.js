/**
 * Backend Test Setup
 * Configures the test environment for Node.js/Express tests
 */

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
});

