
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: base: './' is required for Capacitor/Android to load assets from the local file system
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Increase chunk size warning limit since we're optimizing chunks
    chunkSizeWarningLimit: 1000,
    // optimize chunks for mobile loading speed
    rollupOptions: {
        output: {
            // Better chunk splitting strategy
            manualChunks: (id) => {
                // Vendor libraries
                if (id.includes('node_modules')) {
                    // React ecosystem
                    if (id.includes('react') || id.includes('react-dom')) {
                        return 'react-vendor';
                    }
                    // Capacitor libraries
                    if (id.includes('capacitor')) {
                        return 'capacitor-vendor';
                    }
                    // UI libraries
                    if (id.includes('lucide-react')) {
                        return 'ui-vendor';
                    }
                    // HTTP client
                    if (id.includes('axios')) {
                        return 'http-vendor';
                    }
                    // Default vendor chunk
                    return 'vendor';
                }
            },
            // Optimize output format
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
        }
    },
    // Enable minification for smaller bundle
    minify: 'terser',
    terserOptions: {
        compress: {
            drop_console: true, // Remove console logs in production
            drop_debugger: true
        }
    }
  },
  server: {
    // Expose to network so you can test on phone via IP before building APK
    host: true 
  }
});
