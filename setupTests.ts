import { expect, vi } from 'vitest';
import '@testing-library/jest-dom';

// Happy‑DOM shims
class ResizeObserver { 
  observe(){} 
  unobserve(){} 
  disconnect(){} 
}
(globalThis as any).ResizeObserver = ResizeObserver;

// matchMedia shim
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false, 
    media: q, 
    onchange: null,
    addListener: vi.fn(), 
    removeListener: vi.fn(),
    addEventListener: vi.fn(), 
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Make vi globally available for tests
(globalThis as any).vi = vi;
(globalThis as any).expect = expect;