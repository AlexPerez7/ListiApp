import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Item, ShoppingList } from '../types'

const LISTS_LIMIT = 200

interface DbItem {
  id: string
  list_id: string
  name: string
  quantity: string | null
  done: boolean
  created_at: string
}

interface DbListRow {
  id: string
  name: string
  created_at: string
}

interface DbList extends DbListRow {
  items: DbItem[]
}

function mapItem(row: DbItem): Item {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity ?? undefined,
    done: row.done,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function mapList(row: DbList): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
    items: row.items
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(mapItem),
  }
}

export function useShoppingLists(session: Session | null) {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLists = useCallback(async () => {
    const { data, error } = await supabase
      .from('lists')
      .select('id, name, created_at, items(id, list_id, name, quantity, done, created_at)')
      .order('created_at', { ascending: false })
      .limit(LISTS_LIMIT)

    if (error) {
      console.error('Error al cargar listas:', error.message)
      return
    }
    setLists(((data ?? []) as DbList[]).map(mapList))
  }, [])

  useEffect(() => {
    if (!session) {
      setLists([])
      setLoading(false)
      return
    }

    setLoading(true)
    fetchLists().finally(() => setLoading(false))

    const channel = supabase
      .channel('shopping-lists-changes')
      .on<DbListRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists' },
        (payload) => {
          setLists((prev) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              return prev.filter((list) => list.id !== deletedId)
            }

            const row = payload.new
            const existing = prev.find((list) => list.id === row.id)
            const next = existing
              ? prev.map((list) =>
                  list.id === row.id
                    ? { ...list, name: row.name, createdAt: new Date(row.created_at).getTime() }
                    : list,
                )
              : [{ id: row.id, name: row.name, createdAt: new Date(row.created_at).getTime(), items: [] }, ...prev]

            return next.slice().sort((a, b) => b.createdAt - a.createdAt)
          })
        },
      )
      .on<DbItem>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          setLists((prev) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              return prev.map((list) => ({
                ...list,
                items: list.items.filter((item) => item.id !== deletedId),
              }))
            }

            const row = payload.new
            const mapped = mapItem(row)
            return prev.map((list) => {
              if (list.id !== row.list_id) return list
              const existing = list.items.find((item) => item.id === row.id)
              const items = existing
                ? list.items.map((item) => (item.id === row.id ? mapped : item))
                : [...list.items, mapped].sort((a, b) => a.createdAt - b.createdAt)
              return { ...list, items }
            })
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, fetchLists])

  function createList(name: string): string {
    const id = crypto.randomUUID()
    const newList: ShoppingList = { id, name, items: [], createdAt: Date.now() }
    setLists((prev) => [newList, ...prev])

    supabase
      .from('lists')
      .insert({ id, name })
      .then(({ error }) => {
        if (error) console.error('Error al crear lista:', error.message)
      })

    return id
  }

  function deleteList(listId: string) {
    setLists((prev) => prev.filter((list) => list.id !== listId))

    supabase
      .from('lists')
      .delete()
      .eq('id', listId)
      .then(({ error }) => {
        if (error) console.error('Error al eliminar lista:', error.message)
      })
  }

  function addItem(listId: string, name: string, quantity?: string) {
    const id = crypto.randomUUID()
    const trimmedQuantity = quantity?.trim() || undefined
    const newItem: Item = { id, name, quantity: trimmedQuantity, done: false, createdAt: Date.now() }

    setLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, items: [...list.items, newItem] } : list)),
    )

    supabase
      .from('items')
      .insert({ id, list_id: listId, name, quantity: trimmedQuantity ?? null })
      .then(({ error }) => {
        if (error) console.error('Error al agregar ítem:', error.message)
      })
  }

  function toggleItem(listId: string, itemId: string) {
    const list = lists.find((l) => l.id === listId)
    const item = list?.items.find((i) => i.id === itemId)
    if (!item) return
    const nextDone = !item.done

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: nextDone } : i)) }
          : l,
      ),
    )

    supabase
      .from('items')
      .update({ done: nextDone })
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) console.error('Error al actualizar ítem:', error.message)
      })
  }

  function deleteItem(listId: string, itemId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: list.items.filter((item) => item.id !== itemId) } : list,
      ),
    )

    supabase
      .from('items')
      .delete()
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) console.error('Error al eliminar ítem:', error.message)
      })
  }

  return { lists, loading, createList, deleteList, addItem, toggleItem, deleteItem }
}
