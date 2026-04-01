import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const MAX_BYTES = 25 * 1024 * 1024

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

function formatMiB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

function toPosixRelative(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

try {
  const files = walk(PUBLIC_DIR)
  const oversized = files
    .map((filePath) => ({ filePath, size: statSync(filePath).size }))
    .filter(({ size }) => size > MAX_BYTES)

  if (oversized.length > 0) {
    console.error('❌ Cloudflare Pages supports a maximum file size of 25 MiB.')
    console.error('The following files in public/ exceed the limit:')

    for (const item of oversized) {
      console.error(`- ${toPosixRelative(item.filePath)} (${formatMiB(item.size)})`)
    }

    console.error('\nPlease compress, split, or host these files externally before deploying.')
    process.exit(1)
  }
} catch {
  // If public/ does not exist, skip this check.
}
