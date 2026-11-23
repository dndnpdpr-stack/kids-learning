import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 상대 경로로 빌드: 앱(APK)과 GitHub Pages 하위 경로(/kids-learning/) 모두에서 열린다.
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // 등록은 src/core/offline.ts가 한다 (브라우저에서만).
      injectRegister: false,
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '놀이 학교',
        short_name: '놀이 학교',
        lang: 'ko',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        theme_color: '#fff6e9',
        background_color: '#fff6e9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
