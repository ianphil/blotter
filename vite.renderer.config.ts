import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [tailwindcss()],
  optimizeDeps: {
    exclude: ['@met4citizen/talkinghead'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
