import { supabase } from '../lib/supabaseClient'
import { DEFAULT_PRODUCT_CATALOG, missingDefaultProducts } from '../lib/productCatalog'
import { enqueue } from '../lib/outbox'
import type { ProductCatalogEntry } from '../types'
import { useSyncedCollection, type RealtimePayload } from './useSyncedCollection'
import { readAllPages } from '../lib/pagination'

interface DbProductCatalogEntry {
  id: string
  name: string
  icon_key: string
  image_url: string | null
}

const COLUMNS = 'id, name, icon_key, image_url'

function mapEntry(row: DbProductCatalogEntry): ProductCatalogEntry {
  return { id: row.id, name: row.name, iconKey: row.icon_key, imageUrl: row.image_url ?? undefined }
}

function sortEntries(entries: ProductCatalogEntry[]): ProductCatalogEntry[] {
  return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function fetchCatalog(): Promise<ProductCatalogEntry[] | null> {
  try {
    const rows = await readAllPages<DbProductCatalogEntry>((from, to) => supabase.from('product_catalog')
      .select(COLUMNS).order('id').range(from, to))
    return sortEntries(rows.map(mapEntry))
  } catch (error) {
    console.error('Error al cargar el catálogo de productos:', error)
    return null
  }
}

// Cuenta nueva: crea el catálogo por defecto y lo devuelve.
async function seedIfEmpty(rows: ProductCatalogEntry[]): Promise<ProductCatalogEntry[]> {
  if (rows.length > 0) return rows
  const { data, error } = await supabase
    .from('product_catalog')
    .insert(DEFAULT_PRODUCT_CATALOG.map((entry) => ({ name: entry.name, icon_key: entry.iconKey })))
    .select(COLUMNS)
  if (error) {
    console.error('Error al crear el catálogo de productos inicial:', error.message)
    return rows
  }
  return sortEntries(((data ?? []) as DbProductCatalogEntry[]).map(mapEntry))
}

function applyChange(prev: ProductCatalogEntry[], payload: RealtimePayload): ProductCatalogEntry[] {
  if (payload.eventType === 'DELETE') {
    return prev.filter((entry) => entry.id !== (payload.old as Partial<DbProductCatalogEntry>).id)
  }
  const mapped = mapEntry(payload.new as unknown as DbProductCatalogEntry)
  const exists = prev.some((entry) => entry.id === mapped.id)
  return sortEntries(exists ? prev.map((entry) => (entry.id === mapped.id ? mapped : entry)) : [...prev, mapped])
}

const REALTIME = [{ table: 'product_catalog', apply: applyChange }]

export function useProductCatalog(userId: string) {
  const { data: catalog, setData: setCatalog, loading } = useSyncedCollection<ProductCatalogEntry>({
    userId,
    name: 'catalog',
    fetchAll: fetchCatalog,
    realtime: REALTIME,
    afterFirstFetch: seedIfEmpty,
  })

  function createEntry(name: string, iconKey: string, imageUrl?: string) {
    const id = crypto.randomUUID()
    setCatalog((prev) => sortEntries([...prev, { id, name, iconKey, imageUrl }]))
    enqueue('crear el producto', { kind: 'upsert', table: 'product_catalog', values: { id, name, icon_key: iconKey, image_url: imageUrl ?? null } })
  }

  function updateEntry(entryId: string, name: string, iconKey: string) {
    setCatalog((prev) => sortEntries(prev.map((entry) => (entry.id === entryId ? { ...entry, name, iconKey } : entry))))
    enqueue('editar el producto', {
      kind: 'update',
      table: 'product_catalog',
      values: { name, icon_key: iconKey },
      match: { id: entryId },
    })
  }

  function addDefaultProducts() {
    const entries = missingDefaultProducts(catalog).map((entry) => ({ ...entry, id: crypto.randomUUID() }))
    if (entries.length === 0) return
    setCatalog((prev) => sortEntries([...prev, ...entries]))
    enqueue('agregar productos del catálogo base', { kind: 'upsert', table: 'product_catalog',
      values: entries.map((entry) => ({ id: entry.id, name: entry.name, icon_key: entry.iconKey })) })
  }

  function setEntryImage(entryId: string, imageUrl: string | undefined) {
    setCatalog((prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, imageUrl } : entry)))
    enqueue('guardar la foto del producto', {
      kind: 'update',
      table: 'product_catalog',
      values: { image_url: imageUrl ?? null },
      match: { id: entryId },
    })
  }

  function deleteEntry(entryId: string) {
    setCatalog((prev) => prev.filter((entry) => entry.id !== entryId))
    enqueue('eliminar el producto', { kind: 'delete', table: 'product_catalog', match: { id: entryId } })
  }

  return { catalog, loading, createEntry, updateEntry, deleteEntry, setEntryImage, addDefaultProducts }
}
