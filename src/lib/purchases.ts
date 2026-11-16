import type { Category, Purchase, ShoppingList } from '../types'
import { getCatalogIcon, type CatalogIcon } from './productCatalog'
import { itemTotal, sumItemTotals } from './pricing'

/** Solo datos que determinan la compra; coincide con la comprobación del RPC. */
export function purchaseFingerprint(list: ShoppingList): Record<string, unknown> {
  return JSON.parse(JSON.stringify({ name: list.name, currency: list.currency, budget: list.budget, budgetCurrency: list.budgetCurrency,
    items: [...list.items].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map((item) => ({
      id: item.id, name: item.name, quantity: item.quantity, quantityValue: item.quantityValue,
      quantityUnit: item.quantityUnit, unitPrice: item.unitPrice, price: item.price, done: item.done,
    })),
  })) as Record<string, unknown>
}

export function previewPurchase(list: ShoppingList, currency: string, categories: Category[], catalog: Map<string, CatalogIcon>, id: string): Purchase {
  const bought = list.items.filter((item) => item.done)
  const categoryNames = new Map(categories.map((entry) => [entry.id, entry.name]))
  return {
    id, name: list.name, currency, completedAt: Date.now(), pending: true,
    total: sumItemTotals(bought), purchasedCount: bought.length,
    unpricedCount: bought.filter((item) => itemTotal(item) === undefined).length,
    budget: list.budget, budgetCurrency: list.budgetCurrency,
    items: list.items.map((item) => ({
      id: item.id, name: item.name, quantity: item.quantity, quantityValue: item.quantityValue,
      quantityUnit: item.quantityUnit, unitPrice: item.unitPrice, price: itemTotal(item), done: item.done,
      position: item.position, categoryName: item.categoryId ? categoryNames.get(item.categoryId) : undefined,
      iconKey: item.iconKey ?? getCatalogIcon(catalog, item.name)?.iconKey,
    })),
  }
}

export function repeatedPurchase(purchase: Purchase, categories: Category[]): ShoppingList {
  const now = Date.now()
  const categoryIds = new Map(categories.map((entry) => [entry.name.trim().toLocaleLowerCase('es'), entry.id]))
  return {
    id: crypto.randomUUID(), name: `${purchase.name.slice(0, 65)} (nueva compra)`, currency: purchase.currency,
    createdAt: now, isTemplate: false,
    items: purchase.items.filter((item) => item.done).map((item, index) => ({
      id: crypto.randomUUID(), name: item.name, quantity: item.quantity,
      quantityValue: item.quantityValue, quantityUnit: item.quantityUnit, iconKey: item.iconKey,
      categoryId: item.categoryName ? categoryIds.get(item.categoryName.trim().toLocaleLowerCase('es')) : undefined,
      done: false, position: index, createdAt: now + index,
    })),
  }
}
