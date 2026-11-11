import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // inclui a fonte (woff2) no cache para o app abrir com o visual certo mesmo offline
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'] },
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Shifts',
        short_name: 'Shifts',
        description: 'Sua escala de trabalho e seus compromissos num lugar só.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f6f4',
        theme_color: '#14b8a6',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
