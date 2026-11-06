import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  css: { postcss: { plugins: [] } }, // pakai CSS murni, jangan cari config PostCSS di folder atas
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url))
      }
    }
  }
})
