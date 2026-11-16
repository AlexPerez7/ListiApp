import { describe, expect, it } from 'vitest'
import { buildItemMemory, matchSuggestions } from '../itemSuggestions'
import type { Item, ShoppingList } from '../../types'

function item(name: string, categoryId?: string, createdAt = 1): Item {
  return { id: `${name}-${createdAt}`, name, categoryId, done: false, position: 0, createdAt }
}

const lists: ShoppingList[] = [
  { id: 'a', name: 'A', createdAt: 1, isTemplate: false, items: [item('Leche', 'lacteos', 1), item('Pan')] },
  { id: 'b', name: 'B', createdAt: 2, isTemplate: false, items: [item('leche', 'bebidas', 5), item('Café')] },
]

describe('memoria de ítems', () => {
  const memory = buildItemMemory(lists)

  it('ordena por frecuencia sin distinguir mayúsculas ni acentos', () => {
    expect(memory.names[0]).toBe('Leche')
    expect(memory.names).toHaveLength(3)
  })

  it('recuerda la categoría más reciente de cada producto', () => {
    expect(memory.categoryByName.get('leche')).toBe('bebidas')
    expect(memory.categoryByName.has('pan')).toBe(false)
  })

  it('sugiere excluyendo lo pendiente y suma el catálogo al escribir', () => {
    expect(matchSuggestions(memory.names, ['cafetera'], '', new Set(['pan']))).toEqual(['Leche', 'Café'])
    expect(matchSuggestions(memory.names, ['cafetera', 'cafe'], 'caf', new Set())).toEqual(['Café', 'Cafetera'])
    expect(matchSuggestions(memory.names, [], 'leche', new Set())).toEqual([])
  })
})
