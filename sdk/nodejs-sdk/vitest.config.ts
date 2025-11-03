import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Test directories
    include: ['test/**/*.test.ts', 'test/**/*.test-d.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },

    // TypeScript support
    globals: true,

    // Test timeout
    testTimeout: 10000,

    // Disable threads for better debugging
    threads: false,

    // Clear mocks between tests
    clearMocks: true,

    // Mock reset between tests
    mockReset: true,
  },
});