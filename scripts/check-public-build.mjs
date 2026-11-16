import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const screenFiles = []

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) { await inspect(path); continue }
    if (/\.(js|css)$/.test(entry.name) && entry.name !== 'sw.js' && !entry.name.startsWith('workbox-')) {
      screenFiles.push(relative('dist', path).replaceAll('\\', '/'))
    }
    if (!/\.(js|html|map)$/.test(entry.name)) continue
    const content = await readFile(path, 'utf8')
    let administrativeKey = /sb_secret_[A-Za-z0-9_-]{10,}/.test(content)
    for (const token of content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
      try {
        administrativeKey ||= JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role === 'service_role'
      } catch { /* No es un JWT válido. */ }
    }
    if (administrativeKey) throw new Error('El build contiene una clave administrativa. No se debe publicar.')
  }
}

await inspect('dist')
console.log('Build revisado: no se detectaron claves administrativas de Supabase.')
const worker = await readFile('dist/sw.js', 'utf8')
const cached = new Set([...worker.matchAll(/(?:"url"|url)\s*:\s*["']([^"']+)["']/g)].map((match) => match[1]))
for (const file of screenFiles) {
  if (!cached.has(file)) throw new Error(`Falta un módulo de pantalla en la caché offline: ${file}`)
}
console.log(`PWA revisada: ${screenFiles.length} archivos JS/CSS incluidos en la caché offline.`)
