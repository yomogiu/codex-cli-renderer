import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000,
    host: 'localhost',
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
