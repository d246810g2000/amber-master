import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/amber-master/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/amber-master\/api/, ''),
      },
    },
  },
  base: '/amber-master/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-ui': ['motion', 'lucide-react'],
          'vendor-utils': ['@tanstack/react-query', 'zod', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
