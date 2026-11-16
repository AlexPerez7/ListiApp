import { supabase } from '../lib/supabaseClient'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import { enqueue } from '../lib/outbox'
import type { Category } from '../types'
import { useSyncedCollection, type RealtimePayload } from './useSyncedCollection'
import { readAllPages } from '../lib/pagination'

const COLUMNS = 'id, name, icon, position'

function byPosition(a: Category, b: Category): number {
  return a.position - b.position
}

export async function fetchCategories(): Promise<Category[] | null> {
  try {
    return (await readAllPages<Category>((from, to) => supabase.from('categories')
      .select(COLUMNS).order('id').range(from, to))).sort(byPosition)
  } catch (error) {
    console.error('Error al cargar categorías:', error)
    return null
  }
}

// Cuenta nueva: crea las categorías por defecto y las devuelve.
async function seedIfEmpty(rows: Category[]): Promise<Category[]> {
  if (rows.length > 0) return rows
  const { data, error } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map((category, index) => ({ ...category, position: index })))
    .select(COLUMNS)
  if (error) {
    console.error('Error al crear categorías iniciales:', error.message)
    return rows
  }
  return ((data ?? []) as Category[]).sort(byPosition)
}

function applyChange(prev: Category[], payload: RealtimePayload): Category[] {
  if (payload.eventType === 'DELETE') {
    return prev.filter((category) => category.id !== (payload.old as Partial<Category>).id)
  }
  const row = payload.new as unknown as Category
  const mapped: Category = { id: row.id, name: row.name, icon: row.icon, position: row.position }
  const exists = prev.some((category) => category.id === mapped.id)
  const next = exists ? prev.map((category) => (category.id === mapped.id ? mapped : category)) : [...prev, mapped]
  return next.sort(byPosition)
}

const REALTIME = [{ table: 'categories', apply: applyChange }]

export function useCategories(userId: string) {
  const { data: categories, setData: setCategories, loading } = useSyncedCollection<Category>({
    userId,
    name: 'categories',
    fetchAll: fetchCategories,
    realtime: REALTIME,
    afterFirstFetch: seedIfEmpty,
  })

  function createCategory(name: string, icon: string, restoredPosition?: number): Category {
    const id = crypto.randomUUID()
    const position = restoredPosition ?? (categories.length > 0 ? Math.max(...categories.map((c) => c.position)) + 1 : 0)
    setCategories((prev) => [...prev, { id, name, icon, position }])
    enqueue('crear la categoría', { kind: 'upsert', table: 'categories', values: { id, name, icon, position } })
    return { id, name, icon, position }
  }

  function updateCategory(categoryId: string, name: string, icon: string) {
    setCategories((prev) =>
      prev.map((category) => (category.id === categoryId ? { ...category, name, icon } : category)),
    )
    enqueue('editar la categoría', {
      kind: 'update',
      table: 'categories',
      values: { name, icon },
      match: { id: categoryId },
    })
  }

  function reorderCategories(orderedCategoryIds: string[]) {
    const positionById = new Map(orderedCategoryIds.map((id, index) => [id, index]))
    setCategories((prev) =>
      prev
        .map((category) =>
          positionById.has(category.id) ? { ...category, position: positionById.get(category.id)! } : category,
        )
        .sort(byPosition),
    )
    orderedCategoryIds.forEach((id, index) => {
      enqueue('reordenar las categorías', {
        kind: 'update',
        table: 'categories',
        values: { position: index },
        match: { id },
      })
    })
  }

  function deleteCategory(categoryId: string) {
    setCategories((prev) => prev.filter((category) => category.id !== categoryId))
    enqueue('eliminar la categoría', { kind: 'delete', table: 'categories', match: { id: categoryId } })
  }

  return { categories, loading, createCategory, updateCategory, deleteCategory, reorderCategories }
}
