import { defineConfig } from 'vitest/config'

/**
 * `.mts` so Vite loads it as ESM natively, and tsconfig path aliases resolved
 * through Vite's built-in support rather than the vite-tsconfig-paths plugin.
 * Both avoid deprecation warnings on every test run.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
