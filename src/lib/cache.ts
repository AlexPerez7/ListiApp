// Copia local (localStorage) de los datos del usuario, para que la app abra
// al instante y siga siendo usable sin conexión.
const PREFIX = 'listiapp-cache'

function keyFor(userId: string, name: string): string {
  return `${PREFIX}:${userId}:${name}`
}

export function readCache<T>(userId: string, name: string): T | null {
  try {
    const raw = localStorage.getItem(keyFor(userId, name))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache(userId: string, name: string, value: unknown): void {
  try {
    localStorage.setItem(keyFor(userId, name), JSON.stringify(value))
  } catch {
    // Sin espacio o localStorage bloqueado: la app sigue funcionando sin caché.
  }
}

export function clearCache(userId: string): void {
  try {
    const prefix = `${PREFIX}:${userId}:`
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) localStorage.removeItem(key)
    }
  } catch {
    // nada que limpiar
  }
}
