import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 專案網址為 https://<帳號>.github.io/project-gshop-erp/
  base: '/project-gshop-erp/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
