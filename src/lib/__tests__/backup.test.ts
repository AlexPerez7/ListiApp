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
  it('conserva cantidades numéricas, precios unitarios y presupuesto en formato actual', () => {
    const restored = parseBackup(JSON.stringify(buildBackup([{ ...lists[0], budget: 5000, budgetCurrency: 'CLP', items: [
      { ...lists[0].items[0], quantity: '0,5 kg', quantityValue: 0.5, quantityUnit: 'kg', unitPrice: 3990, price: 1995 },
    ] }], categories)))
    expect(restored.version).toBe(4)
    expect(restored.lists[0]).toMatchObject({ budget: 5000, budgetCurrency: 'CLP' })
    expect(restored.lists[0].items[0]).toMatchObject({ quantityValue: 0.5, quantityUnit: 'kg', unitPrice: 3990, price: 1995 })
  })
  it('acepta formato 2 y rechaza campos financieros inválidos sin reinterpretarlos', () => {
    expect(parseBackup(JSON.stringify({ version: 2, lists: [{ name: 'Anterior', items: [{ name: 'Pan', quantity: '2', price: 3000 }] }] }))
      .lists[0].items[0]).toMatchObject({ price: 3000, quantity: '2' })
    expect(() => parseBackup(JSON.stringify({ version: 3, lists: [{ name: 'Compra', items: [{ name: 'Pan', quantityValue: -1, quantityUnit: 'kg' }] }] })))
      .toThrow('cantidad o unidad inválida')
    expect(() => parseBackup(JSON.stringify({ version: 3, lists: [{ name: 'Compra', budget: -1, budgetCurrency: 'CLP', items: [] }] })))
      .toThrow('presupuesto inválido')
  })
  it('conserva categorías, catálogo, preferencias y fotos embebidas en la versión actual', () => {
    const photo = 'https://example.com/foto.jpg'
    const payload = buildBackup(lists, categories, {
      catalog: [{ id: 'p1', name: 'Avena', iconKey: 'oats', imageUrl: photo }],
      preferences: { theme: 'dark', currency: 'CLP' },
      productPhotos: [{ nameKey: 'avena', imageUrl: photo }],
    })
    payload.images = { [photo]: 'data:image/jpeg;base64,YQ==' }
    const restored = parseBackup(JSON.stringify(payload))
    expect(restored.version).toBe(4)
    expect(restored.categories).toEqual([{ name: 'Bebidas', icon: '🥤', position: 0 }])
    expect(restored.catalog?.[0]).toMatchObject({ name: 'Avena', iconKey: 'oats', imageUrl: photo })
    expect(restored.preferences).toEqual({ theme: 'dark', currency: 'CLP' })
    expect(restored.productPhotos).toEqual([{ nameKey: 'avena', imageUrl: photo }])
    expect(restored.images?.[photo]).toBe('data:image/jpeg;base64,YQ==')
  })

  it('acepta respaldos anteriores y cuentas sin listas que tengan otros datos', () => {
    expect(parseBackup(JSON.stringify({ version: 1, lists: [{ name: 'Antes', items: [] }] })).version).toBe(1)
    expect(parseBackup(JSON.stringify(buildBackup([], categories))).categories).toHaveLength(1)
  })

  it('rechaza versiones futuras y copias de imágenes inválidas', () => {
    expect(() => parseBackup('{"version":99,"lists":[]}')).toThrow('versión')
    expect(() => parseBackup(JSON.stringify({ version: 2, lists: [], categories,
      images: { 'https://example.com/img': 'data:text/html;base64,YQ==' } }))).toThrow('imagen inválida')
  })
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
