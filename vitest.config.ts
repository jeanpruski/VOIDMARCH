import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.e2e.ts'],
    testTimeout: 15000,
  },
});
