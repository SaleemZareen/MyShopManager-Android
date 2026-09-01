import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.APP_URL': JSON.stringify(process.env.APP_URL || '')
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
