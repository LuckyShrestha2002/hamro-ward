import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The frontend dev server proxies /api requests to the backend so the
// browser never needs to know the backend port (and no CORS headaches).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
  // Unit tests run in Node (all our tested modules are pure functions).
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
