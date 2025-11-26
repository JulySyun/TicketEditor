import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This must match your repository name for GitHub Pages to work
  base: '/TicketEditor/',
  build: {
    outDir: 'docs', // Change dist to docs so GitHub Pages can serve it easily
  }
});