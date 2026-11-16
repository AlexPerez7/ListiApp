import type { Purchase, PurchaseItem } from '../types'
import { supabase } from '../lib/supabaseClient'
import { readAllPages } from '../lib/pagination'
import { enqueue } from '../lib/outbox'
import { useSyncedCollection, type RealtimePayload } from './useSyncedCollection'

interface DbPurchase {
  id: string; name: string; completed_at: string; currency: string; total: number
  purchased_count: number; unpriced_count: number; budget: number | null; budget_currency: string | null; items: PurchaseItem[]
}
const COLUMNS = 'id,name,completed_at,currency,total,purchased_count,unpriced_count,budget,budget_currency,items'
function mapPurchase(row: DbPurchase): Purchase {
  return { id: row.id, name: row.name, completedAt: new Date(row.completed_at).getTime(), currency: row.currency,
    total: row.total, purchasedCount: row.purchased_count, unpricedCount: row.unpriced_count,
    budget: row.budget ?? undefined, budgetCurrency: row.budget_currency ?? undefined, items: row.items }
}
const sort = (entries: Purchase[]) => [...entries].sort((a, b) => b.completedAt - a.completedAt)
export async function fetchPurchaseHistory(): Promise<Purchase[] | null> {
  try {
    return sort((await readAllPages<DbPurchase>((from, to) => supabase.from('purchase_history')
      .select(COLUMNS).order('id').range(from, to))).map(mapPurchase))
  } catch (error) { console.error('No se pudo cargar el historial:', error); return null }
}
const REALTIME = [{ table: 'purchase_history', apply: (previous: Purchase[], payload: RealtimePayload) => {
  if (payload.eventType === 'DELETE') return previous.filter((entry) => entry.id !== payload.old.id)
  const row = mapPurchase(payload.new as unknown as DbPurchase)
  return sort([row, ...previous.filter((entry) => entry.id !== row.id)])
} }]
export function usePurchaseHistory(userId: string) {
  const { data: purchases, setData, loading } = useSyncedCollection<Purchase>({ userId, name: 'purchases', fetchAll: fetchPurchaseHistory, realtime: REALTIME })
  function addPreview(entry: Purchase) { setData((previous) => sort([entry, ...previous.filter((row) => row.id !== entry.id)])) }
  function importPurchases(entries: Purchase[]) {
    for (const entry of entries) {
      const id = crypto.randomUUID()
      addPreview({ ...entry, id, pending: true })
      enqueue(`restaurar la compra «${entry.name}»`, { kind: 'upsert', table: 'purchase_history', ignoreDuplicates: true,
        values: { id, source_list_id: null, name: entry.name, completed_at: new Date(entry.completedAt).toISOString(),
          currency: entry.currency, total: entry.total, budget: entry.budget ?? null, budget_currency: entry.budgetCurrency ?? null,
          items: entry.items },
      })
    }
  }
  return { purchases, loading, addPreview, importPurchases }
}
