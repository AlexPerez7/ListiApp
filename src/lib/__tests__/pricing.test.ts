import { describe, expect, it } from 'vitest'
import { calculateSubtotal, itemTotal, parseQuantity, readPurchaseDraft, sumItemTotals } from '../pricing'
import { budgetSummary } from '../budget'
import type { ShoppingList } from '../../types'

describe('cantidades y precios', () => {
  it('acepta coma, punto y hasta tres decimales sin confundirlos con miles', () => {
    expect(parseQuantity('0,5')).toBe(0.5)
    expect(parseQuantity('2.125')).toBe(2.125)
    for (const value of ['', '0', '-1', '1e3', '2 kg', '0.0001', '1.000.000', '1000001']) expect(parseQuantity(value)).toBeUndefined()
  })
  it('calcula subtotales y redondea medio centavo hacia arriba', () => {
    expect(calculateSubtotal(2, 1500)).toBe(3000)
    expect(calculateSubtotal(0.5, 3990)).toBe(1995)
    expect(calculateSubtotal(0.5, 0.01)).toBe(0.01)
    expect(sumItemTotals([{ price: 0.1 }, { price: 0.2 }])).toBe(0.3)
  })
  it('los precios antiguos y el modo total no se multiplican', () => {
    expect(itemTotal({ price: 3000, quantityValue: 2 })).toBe(3000)
    expect(readPurchaseDraft({ legacyQuantity: '2 kg', quantity: '1', unit: 'unit', price: '3000', mode: 'total' }, 'CLP'))
      .toMatchObject({ quantity: '2 kg', price: 3000, unitPrice: undefined, quantityValue: undefined })
  })
  it('distingue precio por unidad de precio total y permite productos gratis', () => {
    expect(readPurchaseDraft({ quantity: '2', unit: 'unit', price: '1.500', mode: 'unit' }, 'CLP'))
      .toMatchObject({ quantityValue: 2, unitPrice: 1500, price: 3000 })
    expect(readPurchaseDraft({ quantity: '2', unit: 'kg', price: '1.500', mode: 'total' }, 'CLP').price).toBe(1500)
    expect(readPurchaseDraft({ quantity: '2', unit: 'unit', price: '0', mode: 'unit' }, 'CLP').price).toBe(0)
  })
  it('rechaza precios inválidos y subtotales fuera del rango de la base', () => {
    for (const price of ['-100', 'abc', '1e3']) {
      expect(() => readPurchaseDraft({ quantity: '2', unit: 'unit', price, mode: 'unit' }, 'CLP')).toThrow('precio válido')
    }
    expect(() => readPurchaseDraft({ quantity: '1000000', unit: 'unit', price: '100', mode: 'unit' }, 'CLP')).toThrow('subtotal')
  })
})

describe('presupuesto', () => {
  const list: ShoppingList = { id: 'l', name: 'Compra', createdAt: 1, isTemplate: false, budget: 4000, budgetCurrency: 'CLP', items: [
    { id: '1', name: 'Pan', quantityValue: 2, quantityUnit: 'unit', unitPrice: 1500, price: 3000, done: true, position: 0, createdAt: 1 },
    { id: '2', name: 'Leche', price: 1500, done: false, position: 1, createdAt: 2 },
    { id: '3', name: 'Sin precio', done: false, position: 2, createdAt: 3 },
  ] }
  it('diferencia lo comprado, el total previsto y los precios que faltan', () => {
    expect(budgetSummary(list, 'CLP')).toMatchObject({ spent: 3000, pending: 1500, remaining: 1000, projectedRemaining: -500, unpriced: 1 })
  })
  it('no compara monedas diferentes ni confunde presupuesto cero con ausencia', () => {
    expect(budgetSummary(list, 'USD')).toMatchObject({ matchesCurrency: false, remaining: undefined, projectedRemaining: undefined })
    expect(budgetSummary({ ...list, budget: 0 }, 'CLP').remaining).toBe(-3000)
    expect(budgetSummary({ ...list, budget: undefined }, 'CLP').remaining).toBeUndefined()
  })
})
