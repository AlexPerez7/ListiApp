import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { deleteItemImage } from '../lib/imageUpload'
import type { BackupPayload } from '../lib/backup'
import type { Category, Item, ShoppingList } from '../types'

const LISTS_LIMIT = 200

interface DbItem {
  id: string
  list_id: string
  name: string
  quantity: string | null
  category_id: string | null
  price: number | null
  image_url: string | null
  position: number
  done: boolean
  created_at: string
}

interface DbListRow {
  id: string
  name: string
  created_at: string
  is_template: boolean
}

interface DbList extends DbListRow {
  items: DbItem[]
}

function mapItem(row: DbItem): Item {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity ?? undefined,
    categoryId: row.category_id ?? undefined,
    price: row.price ?? undefined,
    imageUrl: row.image_url ?? undefined,
    done: row.done,
    position: row.position,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function mapList(row: DbList): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
    isTemplate: row.is_template,
    items: row.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(mapItem),
  }
}

export function useShoppingLists(session: Session | null) {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLists = useCallback(async () => {
    const { data, error } = await supabase
      .from('lists')
      .select(
        'id, name, created_at, is_template, items(id, list_id, name, quantity, category_id, price, image_url, position, done, created_at)',
      )
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
                    ? {
                        ...list,
                        name: row.name,
                        createdAt: new Date(row.created_at).getTime(),
                        isTemplate: row.is_template,
                      }
                    : list,
                )
              : [
                  {
                    id: row.id,
                    name: row.name,
                    createdAt: new Date(row.created_at).getTime(),
                    isTemplate: row.is_template,
                    items: [],
                  },
                  ...prev,
                ]

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
                : [...list.items, mapped].sort((a, b) => a.position - b.position)
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
    const newList: ShoppingList = { id, name, items: [], createdAt: Date.now(), isTemplate: false }
    setLists((prev) => [newList, ...prev])

    supabase
      .from('lists')
      .insert({ id, name })
      .then(({ error }) => {
        if (error) console.error('Error al crear lista:', error.message)
      })

    return id
  }

  function duplicateList(listId: string): string | undefined {
    const original = lists.find((l) => l.id === listId)
    if (!original) return

    return duplicateListAs(original, `${original.name} (copia)`, false)
  }

  function createListFromTemplate(listId: string): string | undefined {
    const original = lists.find((l) => l.id === listId)
    if (!original) return
    return duplicateListAs(original, original.name, false)
  }

  function duplicateListAs(original: ShoppingList, name: string, isTemplate: boolean): string {
    const newListId = crypto.randomUUID()
    const newList: ShoppingList = {
      id: newListId,
      name,
      createdAt: Date.now(),
      isTemplate,
      items: original.items.map((item) => ({ ...item, id: crypto.randomUUID(), done: false })),
    }

    setLists((prev) => [newList, ...prev])

    supabase
      .from('lists')
      .insert({ id: newListId, name: newList.name, is_template: isTemplate })
      .then(async ({ error }) => {
        if (error) {
          console.error('Error al duplicar lista:', error.message)
          return
        }
        if (newList.items.length === 0) return

        const { error: itemsError } = await supabase.from('items').insert(
          newList.items.map((item) => ({
            id: item.id,
            list_id: newListId,
            name: item.name,
            quantity: item.quantity ?? null,
            category_id: item.categoryId ?? null,
            price: item.price ?? null,
            image_url: item.imageUrl ?? null,
            position: item.position,
            done: false,
          })),
        )
        if (itemsError) console.error('Error al duplicar ítems:', itemsError.message)
      })

    return newListId
  }

  // Restaura un backup exportado con buildBackup. Crea listas/items nuevos
  // (no pisa nada existente); las categorías se asocian por nombre a las
  // que ya tenga el usuario, y si no hay ninguna que coincida el item queda
  // sin categoría en vez de crear una nueva.
  async function importBackup(payload: BackupPayload, categories: Category[]) {
    const categoryIdByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]))

    for (const listData of payload.lists) {
      const listId = crypto.randomUUID()
      const items = listData.items.map((itemData, index) => ({
        id: crypto.randomUUID(),
        list_id: listId,
        name: itemData.name,
        quantity: itemData.quantity ?? null,
        category_id: itemData.categoryName
          ? (categoryIdByName.get(itemData.categoryName.trim().toLowerCase()) ?? null)
          : null,
        price: itemData.price ?? null,
        image_url: itemData.imageUrl ?? null,
        position: index,
        done: itemData.done,
      }))

      const { error } = await supabase.from('lists').insert({ id: listId, name: listData.name })
      if (error) {
        console.error('Error al importar lista:', error.message)
        continue
      }
      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('items').insert(items)
        if (itemsError) console.error('Error al importar ítems:', itemsError.message)
      }
    }

    await fetchLists()
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

  function addItem(listId: string, name: string, quantity?: string, categoryId?: string) {
    const id = crypto.randomUUID()
    const trimmedQuantity = quantity?.trim() || undefined
    const newItem: Item = {
      id,
      name,
      quantity: trimmedQuantity,
      categoryId,
      done: false,
      position: Date.now(),
      createdAt: Date.now(),
    }

    setLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, items: [...list.items, newItem] } : list)),
    )

    supabase
      .from('items')
      .insert({
        id,
        list_id: listId,
        name,
        quantity: trimmedQuantity ?? null,
        category_id: categoryId ?? null,
        position: newItem.position,
      })
      .then(({ error }) => {
        if (error) console.error('Error al agregar ítem:', error.message)
      })
  }

  function updateItem(
    listId: string,
    itemId: string,
    name: string,
    quantity?: string,
    categoryId?: string,
    price?: number,
  ) {
    const trimmedQuantity = quantity?.trim() || undefined

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, name, quantity: trimmedQuantity, categoryId, price } : item,
              ),
            }
          : list,
      ),
    )

    supabase
      .from('items')
      .update({
        name,
        quantity: trimmedQuantity ?? null,
        category_id: categoryId ?? null,
        price: price ?? null,
      })
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) console.error('Error al editar ítem:', error.message)
      })
  }

  function swapItemPositions(listId: string, itemId: string, neighborId: string) {
    const list = lists.find((l) => l.id === listId)
    const item = list?.items.find((i) => i.id === itemId)
    const neighbor = list?.items.find((i) => i.id === neighborId)
    if (!item || !neighbor) return

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) => {
                if (i.id === item.id) return { ...i, position: neighbor.position }
                if (i.id === neighbor.id) return { ...i, position: item.position }
                return i
              }),
            }
          : l,
      ),
    )

    Promise.all([
      supabase.from('items').update({ position: neighbor.position }).eq('id', item.id),
      supabase.from('items').update({ position: item.position }).eq('id', neighbor.id),
    ]).then(([a, b]) => {
      if (a.error) console.error('Error al reordenar ítem:', a.error.message)
      if (b.error) console.error('Error al reordenar ítem:', b.error.message)
    })
  }

  function toggleTemplate(listId: string) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const nextIsTemplate = !list.isTemplate

    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, isTemplate: nextIsTemplate } : l)))

    supabase
      .from('lists')
      .update({ is_template: nextIsTemplate })
      .eq('id', listId)
      .then(({ error }) => {
        if (error) console.error('Error al marcar la lista como plantilla:', error.message)
      })
  }

  // Reordena por drag & drop: recibe los ids de un mismo grupo (categoria) en
  // su nuevo orden y les asigna posiciones secuenciales. Las posiciones son
  // solo comparables entre items del mismo grupo (ver groupByCategory), asi
  // que no importa que se solapen con las de otro grupo.
  function reorderItems(listId: string, orderedItemIds: string[]) {
    const positionById = new Map(orderedItemIds.map((id, index) => [id, index]))

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                positionById.has(item.id) ? { ...item, position: positionById.get(item.id)! } : item,
              ),
            }
          : list,
      ),
    )

    Promise.all(
      orderedItemIds.map((id, index) => supabase.from('items').update({ position: index }).eq('id', id)),
    ).then((results) => {
      const failed = results.find((r) => r.error)
      if (failed?.error) console.error('Error al reordenar ítems:', failed.error.message)
    })
  }

  function updateListName(listId: string, name: string) {
    setLists((prev) => prev.map((list) => (list.id === listId ? { ...list, name } : list)))

    supabase
      .from('lists')
      .update({ name })
      .eq('id', listId)
      .then(({ error }) => {
        if (error) console.error('Error al renombrar lista:', error.message)
      })
  }

  function clearCompleted(listId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: list.items.filter((item) => !item.done) } : list,
      ),
    )

    supabase
      .from('items')
      .delete()
      .eq('list_id', listId)
      .eq('done', true)
      .then(({ error }) => {
        if (error) console.error('Error al vaciar comprados:', error.message)
      })
  }

  function restoreItem(listId: string, item: Item) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: [...list.items, item].sort((a, b) => a.position - b.position) }
          : list,
      ),
    )

    supabase
      .from('items')
      .insert({
        id: item.id,
        list_id: listId,
        name: item.name,
        quantity: item.quantity ?? null,
        category_id: item.categoryId ?? null,
        price: item.price ?? null,
        image_url: item.imageUrl ?? null,
        position: item.position,
        done: item.done,
        created_at: new Date(item.createdAt).toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('Error al restaurar ítem:', error.message)
      })
  }

  function restoreList(list: ShoppingList) {
    setLists((prev) => [...prev, list].sort((a, b) => b.createdAt - a.createdAt))

    supabase
      .from('lists')
      .insert({
        id: list.id,
        name: list.name,
        created_at: new Date(list.createdAt).toISOString(),
        is_template: list.isTemplate,
      })
      .then(async ({ error }) => {
        if (error) {
          console.error('Error al restaurar lista:', error.message)
          return
        }
        if (list.items.length === 0) return

        const { error: itemsError } = await supabase.from('items').insert(
          list.items.map((item) => ({
            id: item.id,
            list_id: list.id,
            name: item.name,
            quantity: item.quantity ?? null,
            category_id: item.categoryId ?? null,
            price: item.price ?? null,
            image_url: item.imageUrl ?? null,
            position: item.position,
            done: item.done,
            created_at: new Date(item.createdAt).toISOString(),
          })),
        )
        if (itemsError) console.error('Error al restaurar ítems:', itemsError.message)
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

  function setItemImage(listId: string, itemId: string, imageUrl: string | undefined) {
    const previousImageUrl = lists.find((list) => list.id === listId)?.items.find((item) => item.id === itemId)
      ?.imageUrl

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.map((item) => (item.id === itemId ? { ...item, imageUrl } : item)) }
          : list,
      ),
    )

    supabase
      .from('items')
      .update({ image_url: imageUrl ?? null })
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) {
          console.error('Error al guardar la foto del ítem:', error.message)
          return
        }
        if (!imageUrl && previousImageUrl && session?.user.id) {
          deleteItemImage(session.user.id, itemId, previousImageUrl)
        }
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

  return {
    lists,
    loading,
    createList,
    duplicateList,
    createListFromTemplate,
    toggleTemplate,
    deleteList,
    addItem,
    updateItem,
    swapItemPositions,
    reorderItems,
    toggleItem,
    setItemImage,
    deleteItem,
    updateListName,
    clearCompleted,
    restoreItem,
    restoreList,
    importBackup,
  }
}
