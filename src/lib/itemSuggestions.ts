import type { ShoppingList } from '../types'

// Nombres de ítems ordenados por frecuencia de uso (de más a menos
// comprado), para sugerir accesos rápidos al agregar un ítem nuevo.
export function buildItemNameHistory(lists: ShoppingList[]): string[] {
  const freq = new Map<string, number>()
  for (const list of lists) {
    for (const item of list.items) {
      const name = item.name.trim()
      if (!name) continue
      freq.set(name, (freq.get(name) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name)
}

export function matchSuggestions(history: string[], query: string, exclude: Set<string>, limit = 8): string[] {
  const trimmed = query.trim().toLowerCase()
  const matches: string[] = []
  for (const name of history) {
    if (exclude.has(name.toLowerCase())) continue
    if (trimmed && !name.toLowerCase().includes(trimmed)) continue
    if (trimmed && name.toLowerCase() === trimmed) continue
    matches.push(name)
    if (matches.length >= limit) break
  }
  return matches
}
