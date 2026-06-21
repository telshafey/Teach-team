import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [
        react(),
        // VitePWA({
        //   registerType: 'autoUpdate',
        //   includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        //   manifest: {
        //     name: 'أداة إدارة الفريق',
        //     short_name: 'إدارة الفريق',
        //     description: 'تطبيق لإدارة المشاريع، المهام، والحضور للموظفين.',
        //     theme_color: '#0ea5e9',
        //     background_color: '#ffffff',
        //     display: 'standalone',
        //     lang: 'ar',
        //     dir: 'rtl',
        //     icons: [
        //       {
        //         src: 'data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3e%3cdefs%3e%3clinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3e%3cstop offset="0%25" stop-color="%2338bdf8"/%3e%3cstop offset="100%25" stop-color="%230ea5e9"/%3e%3c/linearGradient%3e%3c/defs%3e%3ccircle cx="50" cy="50" r="48" fill="url(%23g)"/%3e%3cpath d="M30 55 L48 70 L75 40" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/%3e%3ccircle cx="50" cy="50" r="5" fill="white"/%3e%3c/svg%3e',
        //         sizes: '192x192',
        //         type: 'image/svg+xml',
        //       },
        //       {
        //         src: 'data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3e%3cdefs%3e%3clinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3e%3cstop offset="0%25" stop-color="%2338bdf8"/%3e%3cstop offset="100%25" stop-color="%230ea5e9"/%3e%3c/linearGradient%3e%3c/defs%3e%3ccircle cx="50" cy="50" r="48" fill="url(%23g)"/%3e%3cpath d="M30 55 L48 70 L75 40" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/%3e%3ccircle cx="50" cy="50" r="5" fill="white"/%3e%3c/svg%3e',
        //         sizes: '512x512',
        //         type: 'image/svg+xml',
        //       }
        //     ]
        //   }
        // })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@shared': path.resolve(__dirname, './packages/shared/src'),
        }
      }
    };
});
