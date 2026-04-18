import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  build: {
    sourcemap: false,
    outDir: 'dist/web',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  plugins: [
    basicSsl(),
  ],
  define: {
    'import.meta.env.VITE_API_BASE': JSON.stringify('/api'),
  },
});
