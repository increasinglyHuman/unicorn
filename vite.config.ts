import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src', 'content'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/test/**',
      ],
    }),
  ],
  build: {
    lib: {
      // Multi-entry build: main library + per-tool content packages.
      // Object-entry syntax tells Vite to preserve each entry's path in dist/,
      // so `content/world/tips.ts` emits to `dist/content/world/tips.{js,cjs}`.
      entry: {
        unicorn: resolve(__dirname, 'src/index.ts'),
        'content/world/tips': resolve(__dirname, 'content/world/tips.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['src/test/**', '**/*.d.ts', 'vite.config.ts'],
    },
  },
});
