/** Solo claves destinadas al navegador; nunca devolver el valor en errores. */
export function isPublicSupabaseKey(key: string | undefined): boolean {
  if (!key) return false
  if (key.startsWith('sb_publishable_')) return true
  if (key.startsWith('sb_secret_')) return false
  try {
    const payload = key.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown }
    return decoded.role === 'anon'
  } catch {
    return false
  }
}
