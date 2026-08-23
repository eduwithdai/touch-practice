import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages (https://<user>.github.io/<repo>/) needs assets served
// from a /<repo>/ subpath. The deploy workflow sets BASE_PATH; local
// dev/build without it falls back to "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
