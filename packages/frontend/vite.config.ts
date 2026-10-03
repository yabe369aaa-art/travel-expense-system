import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@travel-expense/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: [
      'extraction-similar-horses-freedom.trycloudflare.com',
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});