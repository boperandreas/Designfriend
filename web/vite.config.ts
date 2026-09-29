import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Designfriend',
        short_name: 'Designfriend',
        description: 'En kunnig vän som hjälper dig med ditt hem.',
        lang: 'sv',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F3EEE6',
        theme_color: '#F3EEE6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Swedish needs only the Latin subsets of the fonts.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2'],
      },
    }),
  ],
})
