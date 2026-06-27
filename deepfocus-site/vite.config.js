import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Razorpay import removed – handled in serverless functions
// Crypto import removed – handled in serverless functions

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const isCoreReact = id.match(/[\\/node_modules\\/](react|react-dom|react-router-dom|scheduler)[\\/]/);
            if (isCoreReact) {
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
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
// Razorpay API handled by Vercel serverless functions – middleware removed
});
