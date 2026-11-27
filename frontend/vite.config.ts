import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8080' },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.ui.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/App.tsx', 'src/calculator.ts', 'src/api.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
