import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3975,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('react-syntax-highlighter') || id.includes('prismjs') || id.includes('highlight.js') || id.includes('lowlight') || id.includes('refractor')) {
              return 'vendor-syntax-highlighter';
            }
            if (id.includes('react-markdown') || id.includes('remark-gfm')) {
              return 'vendor-markdown';
            }
            if (id.includes('dotlottie-react') || id.includes('@lottiefiles')) {
              return 'vendor-lottie';
            }
            if (id.includes('react-joyride')) {
              return 'vendor-joyride';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
