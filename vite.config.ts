import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: [
      "**/*",
    ],
    manifest:
      {
        "name": "pylae-33",
        "short_name": "pylae-33",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "lang": "en",
        "scope": "/",
        "icons": [
          {
            "src": "/assets/fa-solid-900-7152a693.woff2",
          },
          {
            "src": "/assets/fa-solid-900-67a65763.ttf",
          }
        ]
    }
  })],
})
