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
      '/api/cleaning': {
        target: process.env['services__cleaning-api__https__0'] || 'https://localhost:5101',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api\/cleaning/, '/api'),
      },
      '/api/shopping': {
        target: process.env['services__shopping-api__https__0'] || 'https://localhost:5201',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api\/shopping/, '/api'),
      },
      '/api/finance': {
        target: process.env['services__finance-api__https__0'] || 'https://localhost:5301',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api\/finance/, '/api'),
      },
      '/hubs/cleaning': {
        target: process.env['services__cleaning-api__https__0'] || 'https://localhost:5101',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/hubs/shopping': {
        target: process.env['services__shopping-api__https__0'] || 'https://localhost:5201',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
