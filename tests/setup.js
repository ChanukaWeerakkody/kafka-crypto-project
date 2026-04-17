// Test setup file
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set default test environment variables
process.env.KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092';
process.env.KAFKA_USERNAME = 'test-user';
process.env.KAFKA_PASSWORD = 'test-pass';
process.env.KAFKA_CLIENT_ID = 'test-client';
process.env.SERVER_PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Global test timeout
jest.setTimeout(10000);
