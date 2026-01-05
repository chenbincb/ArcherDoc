import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isElectron = mode === 'electron' || process.env.ELECTRON === 'true';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/webhook': {
          target: 'http://localhost:4567',
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.ELECTRON': JSON.stringify(isElectron),
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    base: isElectron ? './' : './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        }
      }
    }
  };
});
