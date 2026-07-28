/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Preserved: the app is served from a GitHub Pages sub-path.
  base: '/grumpy-guy-ai/',
  build: {
    target: 'es2022',
    // Source maps make the deployed bundle debuggable without shipping extra JS.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split the React runtime from app code so a copy change does not force
        // visitors to re-download the framework. A path-based predicate is used
        // instead of a name list because `react-dom/client` and `scheduler` are
        // separate module ids that a `['react','react-dom']` list does not capture,
        // which left the bulk of react-dom in the entry chunk.
        // The Supabase SDK is already an async chunk via its dynamic import.
        // Zod is intentionally absent from the browser bundle entirely.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // The Worker suite runs in a Node-like context; the rest needs a DOM.
    environmentMatchGlobs: [['functions/**', 'node']],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}', 'functions/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
});
