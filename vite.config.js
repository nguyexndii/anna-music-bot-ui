import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://asking-grain-result-knew.trycloudflare.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
