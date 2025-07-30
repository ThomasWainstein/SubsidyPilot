import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Add custom matchers to avoid dependency issues
expect.extend({
  toBeInTheDocument(received) {
    const pass = received != null;
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in document`,
      pass,
    };
  },
  toBeDisabled(received) {
    const pass = received?.disabled === true;
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be disabled`,
      pass,
    };
  },
  toBeChecked(received) {
    const pass = received?.checked === true;
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be checked`,
      pass,
    };
  },
  toHaveClass(received, className) {
    const pass = received?.classList?.contains(className) === true;
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have class ${className}`,
      pass,
    };
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
global.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};