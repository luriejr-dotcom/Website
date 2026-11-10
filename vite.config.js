import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the built site work from any folder or sub-path,
// which is what GitHub Pages (username.github.io/repo-name/) needs.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
});
