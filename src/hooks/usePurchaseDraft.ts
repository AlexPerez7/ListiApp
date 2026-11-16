import { useState } from 'react'
import type { Item } from '../types'
import { priceToInput } from '../lib/format'
import { usePrefs } from '../lib/prefs'
import type { PurchaseDraft } from '../lib/pricing'

export function usePurchaseDraft(item?: Item) {
  const { currency } = usePrefs()
  return useState<PurchaseDraft>(() => ({
    quantity: String(item?.quantityValue ?? 1).replace('.', ','),
    unit: item?.quantityUnit ?? 'unit',
    price: priceToInput(item?.unitPrice ?? item?.price, currency),
    mode: !item || item.unitPrice !== undefined || (item.quantityValue !== undefined && item.price === undefined) ? 'unit' : 'total',
    legacyQuantity: item?.quantityValue === undefined ? item?.quantity : undefined,
  }))
}
