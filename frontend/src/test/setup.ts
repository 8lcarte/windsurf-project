import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
class ResizeObserverMock implements ResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(target: Element) {}
  unobserve(target: Element) {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  
  constructor(private callback: IntersectionObserverCallback) {}
  
  observe(target: Element): void {}
  unobserve(target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = IntersectionObserverMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
