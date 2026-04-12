import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      selfDestroying: false,
      includeAssets: ['favicon.png', 'logo.png', 'icons/*.png'],
      manifest: {
        name: 'Ministry of Aesthetics',
        short_name: 'MOA',
        description: 'Ministry of Aesthetics — sistem za upravljanje terminima i pacijentima',
        theme_color: '#2BA5A5',
        background_color: '#F7FAFA',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // NE cache-uj Supabase API/auth/storage/realtime — potpuno propusti kroz mrezu.
        // Prethodni NetworkFirst bez timeout-a je blokirao ucitavanje kad je mreza spora
        // i bacao `no-response` kad je cache bio prazan ili je URL bio u query param-ima.
        navigateFallbackDenylist: [/^\/api\//, /supabase\.co/, /^\/anketa\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            // Slike iz Supabase Storage-a — kratak cache za performanse
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*\.(png|jpg|jpeg|webp|svg)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-public-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 dana
            },
          },
          {
            // Google Fonts — long cache
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 godina
            },
          },
        ],
        // Nemoj precache-ovati veoma velike chunk-ove — prebrzi rast cache-a
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
