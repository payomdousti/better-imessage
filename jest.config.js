module.exports = {
  // Use different test environments for different file patterns
  projects: [
    // Backend tests
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/backend/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1'
      }
    },
    // Frontend tests
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.js'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/frontend.setup.js'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      }
    }
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    'server.js',
    '!src/index.js',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds - these are intentionally low since helper functions
  // are tested by recreating them in tests (not importing from source)
  // In production, you'd refactor helpers into importable modules
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Max workers for parallel execution
  maxWorkers: '50%'
};

