import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // The service layer marks itself server-only for Next's bundler. Under Vitest
      // there is no client bundle to protect, so the guard is stubbed out.
      'server-only': new URL('./tests/stubs/server-only.ts', import.meta.url).pathname,
      '@': new URL('./', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
    // Generous, because a developer machine running several dev servers can take a
    // while to register the three accounts each test starts from.
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
