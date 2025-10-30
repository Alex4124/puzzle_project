import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

const base = process.env.NODE_ENV === 'production' ? '/puzzle_project/' : '/';

export default defineConfig({
  base,
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@models': path.resolve(__dirname, './src/models'),
      '@views': path.resolve(__dirname, './src/views'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // Inline all assets
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
