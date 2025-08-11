import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { 
    alias: { 
      '@': path.resolve(__dirname, './src') 
    } 
  },
  worker: { 
    format: 'es' 
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./setupTests.ts'],
    css: true,
  },
});