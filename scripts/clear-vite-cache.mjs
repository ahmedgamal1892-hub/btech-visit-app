import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cacheDir = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'node_modules',
  '.vite',
)

try {
  rmSync(cacheDir, { recursive: true, force: true })
} catch {
  // Ignore missing cache directory.
}
