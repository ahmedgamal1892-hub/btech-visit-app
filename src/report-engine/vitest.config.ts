import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const reportEngineRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: reportEngineRoot,
  resolve: {
    alias: {
      '@': path.resolve(reportEngineRoot, '..'),
    },
  },
  test: {
    include: ['adapters/**/*.test.ts'],
  },
})
