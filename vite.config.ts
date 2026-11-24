import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  base: './',
  build: { outDir: mode === 'extension' ? 'dist/extension' : 'dist/web' },
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts'] },
}))
