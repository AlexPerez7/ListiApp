import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) { await inspect(path); continue }
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
