import { describe, expect, it } from 'vitest'
import { previewPurchase, purchaseFingerprint, repeatedPurchase } from '../purchases'
import { buildBackup, parseBackup } from '../backup'
import type { ShoppingList } from '../../types'
const list: ShoppingList = { id: 'l1', name: 'Súper', currency: 'CLP', createdAt: 1, isTemplate: false, budget: 10000, budgetCurrency: 'CLP', items: [
  { id: 'b', name: 'Pan', quantity: '2 unidades', quantityValue: 2, quantityUnit: 'unit', unitPrice: 1500, price: 3000, done: true, position: 0, createdAt: 1, categoryId: 'c', imageUrl: 'https://example.com/photo' },
  { id: 'a', name: 'Avena', done: true, position: 1, createdAt: 1 },
  { id: 'c', name: 'Leche', price: 2000, done: false, position: 2, createdAt: 1 },
] }
const categories = [{ id: 'c', name: 'Panadería', icon: '🍞', position: 0 }]
describe('compras finalizadas', () => {
  it('guarda una copia independiente, suma solo comprados y distingue precios ausentes de cero', () => {
    const original = structuredClone(list)
    const purchase = previewPurchase(original, 'CLP', categories, new Map(), 'p')
    expect(purchase).toMatchObject({ total: 3000, purchasedCount: 2, unpricedCount: 1, currency: 'CLP', pending: true })
    original.items[0].price = 9000; original.items[0].name = 'Otro'; original.name = 'Otra'
    expect(purchase.items[0]).toMatchObject({ name: 'Pan', price: 3000, categoryName: 'Panadería' })
    expect(purchase.items[0]).not.toHaveProperty('imageUrl')
    expect(previewPurchase({ ...list, items: [{ ...list.items[0], unitPrice: 0, price: 0 }] }, 'CLP', [], new Map(), 'z')).toMatchObject({ total: 0, unpricedCount: 0 })
  })
  it('crea una lista nueva solo con comprados, conserva cantidades y moneda y limpia los importes', () => {
    const purchase = previewPurchase(list, 'CLP', categories, new Map(), 'p')
    const repeated = repeatedPurchase(purchase, categories)
    expect(repeated.id).not.toBe(list.id)
    expect(repeated.currency).toBe('CLP')
    expect(repeated.budget).toBeUndefined()
    expect(repeated.items).toHaveLength(2)
    expect(repeated.items[0]).toMatchObject({ name: 'Pan', quantityValue: 2, quantityUnit: 'unit', done: false, categoryId: 'c' })
    for (const item of repeated.items) { expect(item.price).toBeUndefined(); expect(item.unitPrice).toBeUndefined(); expect(list.items.map((row) => row.id)).not.toContain(item.id) }
  })
  it('normaliza el orden para detectar cambios financieros entre dispositivos', () => {
    const fingerprint = purchaseFingerprint(list)
    expect(fingerprint).toEqual(purchaseFingerprint({ ...list, items: [...list.items].reverse() }))
    expect(fingerprint).not.toEqual(purchaseFingerprint({ ...list, items: list.items.map((item) => ({ ...item, done: false })) }))
    expect(purchaseFingerprint({ ...list, currency: undefined })).not.toHaveProperty('currency')
  })
  it('restaura historial y moneda desde formato 4 recalculando los totales y conserva formato 3', () => {
    const purchase = previewPurchase(list, 'CLP', categories, new Map(), 'p')
    const payload = buildBackup([list], categories, { purchases: [purchase] })
    payload.purchases![0].total = 999999
    const result = parseBackup(JSON.stringify(payload))
    expect(result.lists[0].currency).toBe('CLP')
    expect(result.purchases![0]).toMatchObject({ total: 3000, purchasedCount: 2, unpricedCount: 1, currency: 'CLP' })
    expect(parseBackup(JSON.stringify({ ...payload, lists: [] })).purchases).toHaveLength(1)
    expect(parseBackup(JSON.stringify({ version: 3, lists: [{ name: 'Antes', items: [] }] })).lists[0].currency).toBeUndefined()
  })
  it('rechaza moneda y datos del historial inválidos antes de importar', () => {
    const purchase = previewPurchase(list, 'CLP', categories, new Map(), 'p')
    const raw = (changes: object) => JSON.stringify({ version: 4, lists: [], purchases: [{ ...purchase, ...changes }] })
    expect(() => parseBackup(raw({ currency: 'XXX' }))).toThrow('compra')
    expect(() => parseBackup(raw({ items: [{ name: 'Pan', done: true, quantityValue: -1, quantityUnit: 'kg' }] }))).toThrow('cantidad')
    expect(() => parseBackup(raw({ items: [{ name: 'Pan', done: false }] }))).toThrow('comprados')
  })
})
