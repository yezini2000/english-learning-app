import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    root: __dirname,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec,property}.{ts,tsx}'],
  },
});
