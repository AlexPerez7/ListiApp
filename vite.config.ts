import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Ruta desde la que se sirve la app. En GitHub Pages es el nombre del
// repositorio (el workflow de deploy define BASE_PATH=/ListiApp/); en
// desarrollo o con dominio propio es la raíz.
const base = process.env.BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Las fotos de productos (WebP, ~1-5 kB) quedan por debajo del límite de
    // inlining por defecto (4 kB) y terminarían embebidas en base64 dentro
    // del bundle JS: cada deploy obligaría a descargarlas de nuevo aunque no
    // cambien. Como archivos aparte conservan su nombre con hash y el
    // service worker solo baja las que cambiaron.
    assetsInlineLimit: 0,
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': la versión nueva se descarga pero no se activa sola; la
      // persona decide cuándo actualizar (ver src/lib/appUpdate.ts).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'ListiApp',
        short_name: 'ListiApp',
        description: 'Listas de compras simples, rápidas y siempre a mano.',
        theme_color: '#4CAF93',
        background_color: '#F5F7F3',
        lang: 'es',
        categories: ['shopping', 'productivity'],
        display: 'standalone',
        start_url: base,
        scope: base,
        orientation: 'portrait',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
