import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const mockStorageMap = new Map<string, string>();

if (typeof globalThis.Storage === 'undefined') {
  class Storage {}
  (globalThis as unknown as Record<string, unknown>).Storage = Storage;
}

Storage.prototype.getItem = function (key: string) {
  return mockStorageMap.get(String(key)) ?? null;
};
Storage.prototype.setItem = function (key: string, value: string) {
  mockStorageMap.set(String(key), String(value));
};
Storage.prototype.removeItem = function (key: string) {
  mockStorageMap.delete(String(key));
};
Storage.prototype.clear = function () {
  mockStorageMap.clear();
};

const storageInstance = Object.create(Storage.prototype);
storageInstance.getItem = (k: string) => Storage.prototype.getItem.call(storageInstance, k);
storageInstance.setItem = (k: string, v: string) => Storage.prototype.setItem.call(storageInstance, k, v);
storageInstance.removeItem = (k: string) => Storage.prototype.removeItem.call(storageInstance, k);
storageInstance.clear = () => Storage.prototype.clear.call(storageInstance);

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageInstance,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  if (typeof document !== 'undefined') cleanup();
  mockStorageMap.clear();
  vi.restoreAllMocks();
});

/** jsdom implements neither the Web Speech API nor matchMedia. */
if (typeof document !== 'undefined' && !('speechSynthesis' in globalThis)) {
  Object.defineProperty(globalThis, 'speechSynthesis', {
    writable: true,
    configurable: true,
    value: { speak: vi.fn(), cancel: vi.fn() },
  });
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    writable: true,
    configurable: true,
    value: class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  });
}

if (typeof document !== 'undefined' && !globalThis.matchMedia) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
