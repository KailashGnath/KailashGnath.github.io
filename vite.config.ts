import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Real browser versions instead of 'es2022': newer syntax (class static blocks etc.) is
    // transpiled, so older phones — iOS 15 Safari, un-updated Android Chrome — still run it.
    // Top-level await is supported by all of these.
    target: ['chrome89', 'edge89', 'firefox89', 'safari15'],
    chunkSizeWarningLimit: 900,
  },
});
