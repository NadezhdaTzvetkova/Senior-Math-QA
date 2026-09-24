import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: ['verbose', ['allure-vitest/reporter', { resultsDir: 'allure-results' }]],
    setupFiles: ['allure-vitest/setup'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/cli.ts'],
      reportOnFailure: true,
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 100,
        lines: 90,
      },
    },
  },
});
