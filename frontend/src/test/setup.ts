import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Radix measures checkbox controls; jsdom does not implement layout observers.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  writable: true,
  value: vi.fn(() => 'blob:leaf-preview'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
