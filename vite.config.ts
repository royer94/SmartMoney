import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'SM_icon.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          navigateFallbackDenylist: [
            /OneSignalSDKWorker\.js/,
            /OneSignalSDK/,
          ],
        },
        manifest: {
          name: 'SmartMone¥ AI',
          short_name: 'SmartMone¥',
          description: 'Gestión inteligente de finanzas personales impulsada por IA',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'SM_icon.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'SM_icon.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
