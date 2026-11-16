import type { Item, QuantityUnit } from '../types'
import { parsePrice } from './format'

export const QUANTITY_UNITS: { value: QuantityUnit; label: string; per: string }[] = [
  { value: 'unit', label: 'unidades', per: 'unidad' },
  { value: 'kg', label: 'kg', per: 'kg' },
  { value: 'g', label: 'g', per: 'g' },
  { value: 'l', label: 'litros', per: 'litro' },
  { value: 'ml', label: 'ml', per: 'ml' },
]

export function isQuantityUnit(value: unknown): value is QuantityUnit {
  return QUANTITY_UNITS.some((entry) => entry.value === value)
}

export function parseQuantity(text: string): number | undefined {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(text.trim())) return undefined
  const value = Number(text.trim().replace(',', '.'))
  return value > 0 && value <= 1_000_000 ? value : undefined
}

export function formatQuantity(value: number, unit: QuantityUnit): string {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 3 })} ${unit === 'unit' ? (value === 1 ? 'unidad' : 'unidades') : unit === 'l' ? 'l' : unit}`
}

/** Redondeo decimal a centavos sin multiplicar números binarios de punto flotante. */
export function calculateSubtotal(quantity: number, price: number): number {
  const thousandths = BigInt(Math.round(quantity * 1000))
  const cents = BigInt(Math.round(price * 100))
  return Number((thousandths * cents + 500n) / 1000n) / 100
}

export function itemTotal(item: Pick<Item, 'price' | 'unitPrice' | 'quantityValue'>): number | undefined {
  if (item.unitPrice !== undefined && item.quantityValue !== undefined) {
    return calculateSubtotal(item.quantityValue, item.unitPrice)
  }
  return item.price // Los precios antiguos ya eran totales: nunca multiplicarlos.
}

export function sumItemTotals(items: Pick<Item, 'price' | 'unitPrice' | 'quantityValue'>[]): number {
  return items.reduce((cents, item) => cents + Math.round((itemTotal(item) ?? 0) * 100), 0) / 100
}

export interface PurchaseDraft {
  quantity: string
  unit: QuantityUnit
  price: string
  mode: 'unit' | 'total'
  legacyQuantity?: string
}

export function readPurchaseDraft(draft: PurchaseDraft, currency: string) {
  const quantityValue = draft.legacyQuantity === undefined ? parseQuantity(draft.quantity) : undefined
  if (draft.legacyQuantity === undefined && quantityValue === undefined) {
    throw new Error('Ingresa una cantidad mayor que cero, con hasta 3 decimales y como máximo 1.000.000.')
  }
  const price = parsePrice(draft.price, currency)
  if (draft.price.trim() && (price === undefined || /[^\d.,\s$€]/.test(draft.price))) {
    throw new Error('Ingresa un precio válido, mayor o igual a cero y menor que 100.000.000.')
  }
  if (draft.mode === 'unit' && quantityValue === undefined) throw new Error('Define una cantidad numérica antes de usar precio por unidad.')
  const unitPrice = draft.mode === 'unit' ? price : undefined
  const total = unitPrice !== undefined ? calculateSubtotal(quantityValue!, unitPrice) : price
  if (total !== undefined && total >= 100_000_000) throw new Error('El subtotal debe ser menor que 100.000.000.')
  return {
    quantity: draft.legacyQuantity ?? formatQuantity(quantityValue!, draft.unit),
    quantityValue,
    quantityUnit: quantityValue !== undefined ? draft.unit : undefined,
    unitPrice,
    price: total,
  }
}
