
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
    // optimize chunks for mobile loading speed
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom', 'lucide-react', 'axios'],
                capacitor: ['@capacitor/core', '@capacitor/filesystem']
            }
        }
    }
  },
  server: {
    // Expose to network so you can test on phone via IP before building APK
    host: true 
  }
});
