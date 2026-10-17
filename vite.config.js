import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin({
      apply: 'build', // Chỉ làm rối khi build, không ảnh hưởng lúc chạy dev
      options: {
        compact: true,
        controlFlowFlattening: false, // Giữ 60 FPS mượt mà cho đĩa than & Karaoke
        deadCodeInjection: false,
        stringArray: true,            // Gom toàn bộ chuỗi chữ & đường dẫn API vào mảng ẩn
        stringArrayEncoding: ['base64'], // Mã hóa chuỗi chữ bằng Base64
        stringArrayThreshold: 0.75,
        splitStrings: true,
        unicodeEscapeSequence: false
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false // Đảm bảo tuyệt đối không sinh file .map
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
