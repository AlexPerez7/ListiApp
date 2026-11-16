import type { ShoppingList } from '../types'
import { itemTotal, sumItemTotals } from './pricing'

export function budgetSummary(list: ShoppingList, currency: string) {
  const spent = sumItemTotals(list.items.filter((item) => item.done))
  const pending = sumItemTotals(list.items.filter((item) => !item.done))
  const total = Math.round((spent + pending) * 100) / 100
  const matchesCurrency = list.budgetCurrency === currency
  return {
    spent, pending, total, matchesCurrency,
    unpriced: list.items.filter((item) => itemTotal(item) === undefined).length,
    remaining: list.budget !== undefined && matchesCurrency ? Math.round((list.budget - spent) * 100) / 100 : undefined,
    projectedRemaining: list.budget !== undefined && matchesCurrency ? Math.round((list.budget - total) * 100) / 100 : undefined,
  }
}
