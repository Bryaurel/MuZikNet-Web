import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  build: {
    // 1. Completely disable source maps to save massive amounts of memory
    sourcemap: false, 
    
    // 2. Break the app into smaller chunks so it doesn't process all at once
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Put all third-party libraries in their own chunk
            return 'vendor';
          }
        }
      }
    }
  }
})