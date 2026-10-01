import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
      reportsDirectory: '../.cache/coverage/frontend',
      reporter: ['text', 'html', 'cobertura', 'json-summary'],
      reportOnFailure: true,
      thresholds: { branches: 25 },
    },
  },
});
