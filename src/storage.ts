import type { ShoppingList } from './types'

const STORAGE_KEY = 'listiapp:lists'

export function loadLists(): ShoppingList[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLists(lists: ShoppingList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}
