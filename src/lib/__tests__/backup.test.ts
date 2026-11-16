import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from '../backup'
import type { Category, ShoppingList } from '../../types'

const categories: Category[] = [{ id: 'c1', name: 'Bebidas', icon: '🥤', position: 0 }]
const lists: ShoppingList[] = [
  {
    id: 'l1',
    name: 'Súper',
    createdAt: 1,
    isTemplate: true,
    items: [
      { id: 'i2', name: 'Vino', categoryId: 'c1', price: 4990, done: true, position: 2, createdAt: 2 },
      { id: 'i1', name: 'Pan', quantity: '2', done: false, position: 1, createdAt: 1 },
    ],
  },
]

describe('respaldo', () => {
  it('exporta e importa sin perder datos', () => {
    const restored = parseBackup(JSON.stringify(buildBackup(lists, categories)))
    expect(restored.lists).toHaveLength(1)
    expect(restored.lists[0].isTemplate).toBe(true)
    expect(restored.lists[0].items.map((item) => item.name)).toEqual(['Pan', 'Vino'])
    expect(restored.lists[0].items[1]).toMatchObject({ categoryName: 'Bebidas', price: 4990, done: true })
  })

  it('rechaza archivos que no son un respaldo', () => {
    expect(() => parseBackup('no es json')).toThrow('JSON válido')
    expect(() => parseBackup('{"foo":1}')).toThrow('formato de respaldo')
    expect(() => parseBackup('{"lists":[]}')).toThrow('no contiene listas')
  })

  it('descarta contenido con forma inesperada en vez de confiar en él', () => {
    const restored = parseBackup(
      JSON.stringify({
        lists: [
          null,
          { name: 'Sin ítems válidos', items: [null, { name: '' }, { name: 42 }] },
          {
            name: 'Mixta',
            items: [{ name: 'Leche', price: 'gratis', done: 'sí', imageUrl: 'javascript:alert(1)' }],
          },
        ],
      }),
    )
    expect(restored.lists).toHaveLength(2)
    expect(restored.lists[0].items).toEqual([])
    expect(restored.lists[1].items[0]).toEqual({
      name: 'Leche',
      quantity: undefined,
      price: undefined,
      categoryName: undefined,
      imageUrl: undefined,
      iconKey: undefined,
      done: false,
    })
  })
})
