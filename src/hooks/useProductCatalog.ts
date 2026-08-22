import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { DEFAULT_PRODUCT_CATALOG } from '../lib/productCatalog'
import type { ProductCatalogEntry } from '../types'

interface DbProductCatalogEntry {
  id: string
  name: string
  icon_key: string
  image_url: string | null
}

function mapEntry(row: DbProductCatalogEntry): ProductCatalogEntry {
  return { id: row.id, name: row.name, iconKey: row.icon_key, imageUrl: row.image_url ?? undefined }
}

function sortEntries(entries: ProductCatalogEntry[]): ProductCatalogEntry[] {
  return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function useProductCatalog(session: Session | null) {
  const [catalog, setCatalog] = useState<ProductCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const hasSeededRef = useRef(false)

  const fetchCatalog = useCallback(async () => {
    const { data, error } = await supabase.from('product_catalog').select('id, name, icon_key, image_url')

    if (error) {
      console.error('Error al cargar el catálogo de productos:', error.message)
      return
    }

    const rows = (data ?? []) as DbProductCatalogEntry[]
    setCatalog(sortEntries(rows.map(mapEntry)))

    if (rows.length === 0 && !hasSeededRef.current) {
      hasSeededRef.current = true
      const { error: seedError } = await supabase
        .from('product_catalog')
        .insert(DEFAULT_PRODUCT_CATALOG.map((entry) => ({ name: entry.name, icon_key: entry.iconKey })))
      if (seedError) console.error('Error al crear el catálogo de productos inicial:', seedError.message)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setCatalog([])
      setLoading(false)
      hasSeededRef.current = false
      return
    }

    setLoading(true)
    fetchCatalog().finally(() => setLoading(false))

    const channel = supabase
      .channel('product-catalog-changes')
      .on<DbProductCatalogEntry>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_catalog' },
        (payload) => {
          setCatalog((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((entry) => entry.id !== payload.old.id)
            }

            const mapped = mapEntry(payload.new)
            const existing = prev.find((entry) => entry.id === mapped.id)
            const next = existing
              ? prev.map((entry) => (entry.id === mapped.id ? mapped : entry))
              : [...prev, mapped]
            return sortEntries(next)
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, fetchCatalog])

  function createEntry(name: string, iconKey: string) {
    const id = crypto.randomUUID()
    const newEntry: ProductCatalogEntry = { id, name, iconKey }

    setCatalog((prev) => sortEntries([...prev, newEntry]))

    supabase
      .from('product_catalog')
      .insert({ id, name, icon_key: iconKey })
      .then(({ error }) => {
        if (error) console.error('Error al crear el producto:', error.message)
      })
  }

  function updateEntry(entryId: string, name: string, iconKey: string) {
    setCatalog((prev) => sortEntries(prev.map((entry) => (entry.id === entryId ? { ...entry, name, iconKey } : entry))))

    supabase
      .from('product_catalog')
      .update({ name, icon_key: iconKey })
      .eq('id', entryId)
      .then(({ error }) => {
        if (error) console.error('Error al editar el producto:', error.message)
      })
  }

  function setEntryImage(entryId: string, imageUrl: string | undefined) {
    setCatalog((prev) => sortEntries(prev.map((entry) => (entry.id === entryId ? { ...entry, imageUrl } : entry))))

    supabase
      .from('product_catalog')
      .update({ image_url: imageUrl ?? null })
      .eq('id', entryId)
      .then(({ error }) => {
        if (error) console.error('Error al editar la foto del producto:', error.message)
      })
  }

  function deleteEntry(entryId: string) {
    setCatalog((prev) => prev.filter((entry) => entry.id !== entryId))

    supabase
      .from('product_catalog')
      .delete()
      .eq('id', entryId)
      .then(({ error }) => {
        if (error) console.error('Error al eliminar el producto:', error.message)
      })
  }

  return { catalog, loading, createEntry, updateEntry, deleteEntry, setEntryImage }
}
