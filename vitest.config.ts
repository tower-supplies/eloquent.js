import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  //assetsInclude: ['./src/database/migrations/*.sql'],
  define: {
    //'__DEV__': false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    coverage: {
      reportsDirectory: './tests/coverage',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['./tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'feature',
          include: ['./tests/feature/**/*.test.ts'],
        },
      },
    ],
  },
});
