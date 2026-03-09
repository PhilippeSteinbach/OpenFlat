import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: parseInt(process.env.PORT || '5173'),
    proxy: {
      '/api': {
        target: process.env['services__api__https__0'] || 'https://localhost:5101',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: process.env['services__api__https__0'] || 'https://localhost:5101',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
