import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')
mkdirSync(publicDir, { recursive: true })

const base = path.join(__dirname, 'icon-source.svg')
const maskable = path.join(__dirname, 'icon-maskable-source.svg')

const targets = [
  { src: base, out: 'pwa-64x64.png', size: 64 },
  { src: base, out: 'pwa-192x192.png', size: 192 },
  { src: base, out: 'pwa-512x512.png', size: 512 },
  { src: base, out: 'apple-touch-icon.png', size: 180 },
  { src: maskable, out: 'maskable-icon-512x512.png', size: 512 },
]

for (const t of targets) {
  await sharp(t.src, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(publicDir, t.out))
  console.log('generated', t.out)
}

// favicon.svg (reuse base source directly)
await sharp(base, { density: 384 }).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.png'))
console.log('generated favicon.png')
