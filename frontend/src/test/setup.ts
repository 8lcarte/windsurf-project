import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock environment variables
vi.mock('../config', () => ({
  default: {
    API_URL: 'http://localhost:3000',
  },
}));

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
