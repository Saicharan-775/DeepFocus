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
    chunkSizeWarningLimit: 1000,
  },
// Razorpay API handled by Vercel serverless functions – middleware removed
});
