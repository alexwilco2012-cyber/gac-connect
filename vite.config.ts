/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Deployed under https://<owner>.github.io/gac-connect/ — the base must match
// the repo name. Forks or a custom domain change this one line.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/gac-connect/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
}));
