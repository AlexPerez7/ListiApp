import type { ShoppingList } from '../types'
import { canonicalProductName, normalizeProductName } from './productCatalog'
import { matchesProductSearch } from './search'

export interface ItemMemory {
  /** Nombres ordenados por frecuencia de uso (de más a menos comprado). */
  names: string[]
  /** Última categoría usada para cada producto (por nombre normalizado). */
  categoryByName: Map<string, string>
}

// Lo que la app "recuerda" de compras anteriores: qué se compra más seguido
// (para sugerir accesos rápidos) y en qué categoría va cada producto (para
// asignarla sola al volver a agregarlo).
export function buildItemMemory(lists: ShoppingList[]): ItemMemory {
  const freq = new Map<string, { name: string; count: number }>()
  const categoryByName = new Map<string, { categoryId: string; createdAt: number }>()

  for (const list of lists) {
    for (const item of list.items) {
      const name = item.name.trim()
      const key = normalizeProductName(name)
      if (!key) continue

      const entry = freq.get(key)
      if (entry) entry.count++
      else freq.set(key, { name, count: 1 })

      if (item.categoryId) {
        const known = categoryByName.get(key)
        if (!known || item.createdAt > known.createdAt) {
          categoryByName.set(key, { categoryId: item.categoryId, createdAt: item.createdAt })
        }
      }
    }
  }

  return {
    names: [...freq.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
      .map((entry) => entry.name),
    categoryByName: new Map([...categoryByName].map(([key, value]) => [key, value.categoryId])),
  }
}

function capitalize(name: string): string {
  return name.charAt(0).toLocaleUpperCase('es') + name.slice(1)
}

/**
 * Sugerencias al agregar un ítem: primero lo que ya se compró antes (por
 * frecuencia) y, al escribir, también los productos del catálogo que
 * coincidan. Excluye lo que ya está pendiente en la lista.
 */
export function matchSuggestions(
  names: string[],
  catalogNames: Iterable<string>,
  query: string,
  exclude: Set<string>,
  limit = 8,
): string[] {
  const needle = normalizeProductName(query)
  const matches: string[] = []
  const seen = new Set<string>()
  const excluded = new Set([...exclude].map(canonicalProductName))

  const consider = (name: string) => {
    if (matches.length >= limit) return
    const key = normalizeProductName(name)
    const canonical = canonicalProductName(name)
    if (seen.has(canonical) || excluded.has(canonical) || key === needle) return
    if (needle && !matchesProductSearch(name, needle)) return
    seen.add(canonical)
    matches.push(name)
  }

  for (const name of names) consider(name)
  if (needle) {
    for (const name of catalogNames) consider(capitalize(name))
  }
  return matches
}
