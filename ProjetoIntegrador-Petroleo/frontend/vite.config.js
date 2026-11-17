import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(root, '../wwwroot/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(root, 'src/dashboard.jsx'),
        filters: resolve(root, 'src/filters.js'),
        loginBackground: resolve(root, 'src/login-background.jsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/chart.js/')) return 'chart';
          if (id.includes('node_modules/@microsoft/signalr/')) return 'signalr';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) return 'react';
        },
      },
    },
  },
});
