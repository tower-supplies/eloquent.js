import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'EloquentJS',
      fileName: 'eloquent',
    },
    rollupOptions: {
      // overwrite default .html entry
      input: './src/index.ts',
      output: {
        exports: 'named',
        globals: {
          'expo-sqlite': 'expo-sqlite',
          'react-native': 'react-native',
        },
      },
      external: ['expo-sqlite', 'react-native'],
    },
  },
  plugins: [typescript()],
});
