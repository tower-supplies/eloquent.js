import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  //assetsInclude: ['./src/database/migrations/*.sql'],
  plugins: [typescript()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
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
