import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Enable content-based hashing for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Separate vendor libraries to reduce main bundle size
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'query-vendor': ['@tanstack/react-query'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          'chart-vendor': ['recharts'], // Heavy charting library
        }
      }
    },
    // Enable CSS code splitting to reduce blocking
    cssCodeSplit: true,
    // Enable minification without terser
    minify: mode === 'production',
    // Reduce chunk size threshold to split large chunks
    chunkSizeWarningLimit: 200, // KB
    // Generate sourcemaps for better debugging while maintaining cache efficiency
    sourcemap: mode === 'development',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query']
  },
  // Improve build performance and reduce bundle size
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
