import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@ciaui/core': resolve(__dirname, '../../packages/core/src'),
      '@ciaui/render-webgpu': resolve(__dirname, '../../packages/render-webgpu/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
  },
  // Ensure TypeScript files are handled correctly
  esbuild: {
    target: 'esnext',
  },
});
