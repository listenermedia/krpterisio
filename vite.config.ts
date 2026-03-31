import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      }
    },
    watch: {
      // Ignore server-side files and data directories to prevent constant reloads
      ignored: [
        '**/server.ts',
        '**/tsconfig.server.json',
        '**/data/**',
        '**/reports/**',
        '**/public/reports/**',
        '**/dist/**',
        '**/scripts/**',
        '**/lib/scanner/**',
        '**/lib/ai/**',
        '**/.env',
      ]
    }
  }
});
