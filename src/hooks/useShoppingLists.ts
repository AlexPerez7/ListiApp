import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { deleteItemImage } from '../lib/imageUpload'
import { lookupProductPhoto } from '../lib/productPhotos'
import { enqueue, getOutboxUser, isFinishQueued, whenOutboxIdle } from '../lib/outbox'
import type { BackupPayload } from '../lib/backup'
import type { Category, Item, Purchase, QuantityUnit, ShoppingList } from '../types'
import { repeatedPurchase } from '../lib/purchases'
import { useSyncedCollection, type RealtimePayload } from './useSyncedCollection'
import { readAllPages } from '../lib/pagination'
import { normalizeProductName } from '../lib/productCatalog'
import { itemTotal } from '../lib/pricing'


interface DbItem {
  id: string
  list_id: string
  name: string
  quantity: string | null
  quantity_value: number | null
  quantity_unit: QuantityUnit | null
  unit_price: number | null
  category_id: string | null
  price: number | null
  image_url: string | null
  icon_key: string | null
  position: number
  done: boolean
  created_at: string
}

interface DbListRow {
  id: string
  name: string
  created_at: string
  is_template: boolean
  budget: number | null
  budget_currency: string | null
  currency: string | null
  archived_at: string | null
}

interface DbList extends DbListRow {
  items: DbItem[]
}

function mapItem(row: DbItem): Item {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity ?? undefined,
    quantityValue: row.quantity_value ?? undefined,
    quantityUnit: row.quantity_unit ?? undefined,
    unitPrice: row.unit_price ?? undefined,
    categoryId: row.category_id ?? undefined,
    price: row.price ?? undefined,
    imageUrl: row.image_url ?? undefined,
    iconKey: row.icon_key ?? undefined,
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
    budget: row.budget ?? undefined,
    budgetCurrency: row.budget_currency ?? undefined,
    currency: row.currency ?? undefined,
    items: row.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(mapItem),
  }
}

function itemToRow(listId: string, item: Item) {
  return {
    id: item.id,
    list_id: listId,
    name: item.name,
    quantity: item.quantity ?? null,
    quantity_value: item.quantityValue ?? null,
    quantity_unit: item.quantityUnit ?? null,
    unit_price: item.unitPrice ?? null,
    category_id: item.categoryId ?? null,
    price: item.price ?? null,
    image_url: item.imageUrl ?? null,
    icon_key: item.iconKey ?? null,
    position: item.position,
    done: item.done,
    created_at: new Date(item.createdAt).toISOString(),
  }
}

function listToRow(list: ShoppingList) {
  return {
    id: list.id,
    name: list.name,
    is_template: list.isTemplate,
    budget: list.budget ?? null,
    budget_currency: list.budgetCurrency ?? null,
    currency: list.currency ?? null,
    created_at: new Date(list.createdAt).toISOString(),
  }
}

export async function fetchLists(): Promise<ShoppingList[] | null> {
  try {
    const [rows, items] = await Promise.all([
      readAllPages<DbListRow>((from, to) => supabase.from('lists')
        .select('id, name, created_at, is_template, budget, budget_currency, currency, archived_at').is('archived_at', null).order('id').range(from, to)),
      readAllPages<DbItem>((from, to) => supabase.from('items')
        .select('id, list_id, name, quantity, quantity_value, quantity_unit, unit_price, category_id, price, image_url, icon_key, position, done, created_at, lists!inner(archived_at)')
        .is('lists.archived_at', null)
        .order('id').range(from, to)),
    ])
    const byList = new Map<string, DbItem[]>()
    for (const item of items) {
      const group = byList.get(item.list_id) ?? []
      group.push(item)
      byList.set(item.list_id, group)
    }
    return rows.map((row) => mapList({ ...row, items: byList.get(row.id) ?? [] }))
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error('Error al cargar listas:', error)
    return null
  }
}

function applyListChange(prev: ShoppingList[], payload: RealtimePayload): ShoppingList[] {
  if (payload.eventType === 'DELETE') {
    const deletedId = (payload.old as Partial<DbListRow>).id
    return prev.filter((list) => list.id !== deletedId)
  }

  const row = payload.new as unknown as DbListRow
  if (row.archived_at) return prev.filter((list) => list.id !== row.id)
  const fields = { name: row.name, createdAt: new Date(row.created_at).getTime(), isTemplate: row.is_template,
    budget: row.budget ?? undefined, budgetCurrency: row.budget_currency ?? undefined, currency: row.currency ?? undefined }
  const exists = prev.some((list) => list.id === row.id)
  const next = exists
    ? prev.map((list) => (list.id === row.id ? { ...list, ...fields } : list))
    : [{ id: row.id, items: [], ...fields }, ...prev]
  return next.sort((a, b) => b.createdAt - a.createdAt)
}

function applyItemChange(prev: ShoppingList[], payload: RealtimePayload): ShoppingList[] {
  if (payload.eventType === 'DELETE') {
    const deletedId = (payload.old as Partial<DbItem>).id
    return prev.map((list) =>
      list.items.some((item) => item.id === deletedId)
        ? { ...list, items: list.items.filter((item) => item.id !== deletedId) }
        : list,
    )
  }

  const row = payload.new as unknown as DbItem
  const mapped = mapItem(row)
  return prev.map((list) => {
    if (list.id !== row.list_id) return list
    const exists = list.items.some((item) => item.id === row.id)
    const items = exists
      ? list.items.map((item) => (item.id === row.id ? mapped : item))
      : [...list.items, mapped].sort((a, b) => a.position - b.position)
    return { ...list, items }
  })
}

const REALTIME = [
  { table: 'lists', apply: applyListChange },
  { table: 'items', apply: applyItemChange },
]

export interface NewItemInput {
  name: string
  quantity?: string
  quantityValue?: number
  quantityUnit?: QuantityUnit
  unitPrice?: number
  categoryId?: string
  price?: number
}

export function useShoppingLists(userId: string) {
  const { data: lists, setData: setLists, loading } = useSyncedCollection<ShoppingList>({
    userId,
    name: 'lists',
    fetchAll: fetchLists,
    realtime: REALTIME,
  })
  const listsRef = useRef(lists)
  useEffect(() => { listsRef.current = lists }, [lists])

  function updateList(listId: string, change: (list: ShoppingList) => ShoppingList) {
    setLists((prev) => prev.map((list) => (list.id === listId ? change(list) : list)))
  }

  function updateItemLocal(listId: string, itemId: string, change: (item: Item) => Item) {
    updateList(listId, (list) => ({
      ...list,
      items: list.items.map((item) => (item.id === itemId ? change(item) : item)),
    }))
  }

  function findItem(listId: string, itemId: string): Item | undefined {
    return lists.find((list) => list.id === listId)?.items.find((item) => item.id === itemId)
  }

  // Inserta una lista completa (con sus ítems): crear, duplicar, restaurar e importar.
  function insertList(list: ShoppingList, label: string) {
    setLists((prev) => [...prev, list].sort((a, b) => b.createdAt - a.createdAt))
    enqueue(label, { kind: 'upsert', table: 'lists', values: listToRow(list) })
    if (list.items.length > 0) {
      enqueue(label, {
        kind: 'upsert',
        table: 'items',
        values: list.items.map((item) => itemToRow(list.id, item)),
      })
    }
  }

  function createList(name: string, currency: string): string {
    const id = crypto.randomUUID()
    insertList({ id, name, currency, items: [], createdAt: Date.now(), isTemplate: false }, 'crear la lista')
    return id
  }

  function copyList(original: ShoppingList, name: string): string {
    const id = crypto.randomUUID()
    const now = Date.now()
    insertList(
      {
        id,
        name,
        createdAt: now,
        isTemplate: false,
        budget: original.budget,
        budgetCurrency: original.budgetCurrency,
        currency: original.currency,
        items: original.items.map((item, index) => ({
          ...item,
          id: crypto.randomUUID(),
          done: false,
          createdAt: now + index,
        })),
      },
      'copiar la lista',
    )
    return id
  }

  function duplicateList(listId: string): string | undefined {
    const original = lists.find((l) => l.id === listId)
    return original ? copyList(original, `${original.name} (copia)`) : undefined
  }

  function createListFromTemplate(listId: string): string | undefined {
    const original = lists.find((l) => l.id === listId)
    return original ? copyList(original, original.name) : undefined
  }

  function restoreList(list: ShoppingList) {
    insertList(list, 'restaurar la lista')
  }

  // Restaura un respaldo exportado con buildBackup. Crea listas nuevas (no
  // pisa nada existente); las categorías se asocian por nombre a las que ya
  // tenga el usuario, y si ninguna coincide el ítem queda sin categoría.
  function importBackup(payload: BackupPayload, categories: Category[]): number {
    const categoryIdByName = new Map(categories.map((c) => [normalizeProductName(c.name), c.id]))
    const now = Date.now()

    payload.lists.forEach((listData, listIndex) => {
      const createdAt = now + (payload.lists.length - listIndex)
      insertList(
        {
          id: crypto.randomUUID(),
          name: listData.name,
          createdAt,
          isTemplate: listData.isTemplate === true,
          budget: listData.budget,
          budgetCurrency: listData.budgetCurrency,
          currency: listData.currency,
          items: listData.items.map((itemData, index) => ({
            id: crypto.randomUUID(),
            name: itemData.name,
            quantity: itemData.quantity,
            quantityValue: itemData.quantityValue,
            quantityUnit: itemData.quantityUnit,
            unitPrice: itemData.unitPrice,
            price: itemData.price,
            categoryId: itemData.categoryName
              ? categoryIdByName.get(normalizeProductName(itemData.categoryName))
              : undefined,
            imageUrl: itemData.imageUrl,
            iconKey: itemData.iconKey,
            done: itemData.done,
            position: index,
            createdAt: createdAt + index,
          })),
        },
        'importar el respaldo',
      )
    })

    return payload.lists.length
  }

  function deleteList(listId: string) {
    setLists((prev) => prev.filter((list) => list.id !== listId))
    enqueue(`eliminar la lista «${lists.find((list) => list.id === listId)?.name ?? 'Lista'}»`, { kind: 'delete', table: 'lists', match: { id: listId } })
  }

  function updateListName(listId: string, name: string) {
    updateList(listId, (list) => ({ ...list, name }))
    enqueue('renombrar la lista', { kind: 'update', table: 'lists', values: { name }, match: { id: listId } })
  }

  function toggleTemplate(listId: string) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const isTemplate = !list.isTemplate
    updateList(listId, (l) => ({ ...l, isTemplate }))
    enqueue('actualizar la plantilla', {
      kind: 'update',
      table: 'lists',
      values: { is_template: isTemplate },
      match: { id: listId },
    })
  }

  function setListBudget(listId: string, budget: number | undefined, currency: string) {
    updateList(listId, (list) => ({ ...list, budget, budgetCurrency: budget === undefined ? undefined : currency }))
    enqueue('guardar el presupuesto', { kind: 'update', table: 'lists',
      values: { budget: budget ?? null, budget_currency: budget === undefined ? null : currency }, match: { id: listId } })
  }

  function setListCurrency(listId: string, currency: string) {
    updateList(listId, (list) => ({ ...list, currency }))
    enqueue('confirmar la moneda de la lista', { kind: 'update', table: 'lists', values: { currency }, match: { id: listId } })
  }

  function archiveLocally(listId: string) { setLists((previous) => previous.filter((list) => list.id !== listId)) }

  function repeatPurchase(purchase: Purchase, categories: Category[]): string {
    const list = repeatedPurchase(purchase, categories)
    insertList(list, `repetir la compra «${purchase.name}»`)
    return list.id
  }

  function addItem(listId: string, input: NewItemInput) {
    const now = Date.now()
    const item: Item = {
      id: crypto.randomUUID(),
      name: input.name,
      quantity: input.quantity?.trim() || undefined,
      quantityValue: input.quantityValue,
      quantityUnit: input.quantityUnit,
      unitPrice: input.unitPrice,
      categoryId: input.categoryId,
      price: itemTotal(input),
      done: false,
      position: now,
      createdAt: now,
    }

    updateList(listId, (list) => ({ ...list, items: [...list.items, item] }))
    enqueue('agregar el ítem', { kind: 'upsert', table: 'items', values: itemToRow(listId, item) })

    // Autocompleta la foto recordada para este producto (si hay una) aparte,
    // sin bloquear el guardado del ítem con esa búsqueda.
    if (navigator.onLine) {
      void lookupProductPhoto(item.name).then((imageUrl) => {
        if (!imageUrl) return
        if (getOutboxUser() !== userId || isFinishQueued(listId) || !listsRef.current.some((list) =>
          list.id === listId && list.items.some((current) => current.id === item.id && current.name === item.name))) return
        updateItemLocal(listId, item.id, (current) => ({ ...current, imageUrl }))
        enqueue('guardar la foto del ítem', {
          kind: 'update',
          table: 'items',
          values: { image_url: imageUrl },
          match: { id: item.id },
        })
      })
    }
  }

  function updateItem(listId: string, itemId: string, input: NewItemInput) {
    const quantity = input.quantity?.trim() || undefined
    updateItemLocal(listId, itemId, (item) => ({
      ...item,
      name: input.name,
      quantity,
      quantityValue: input.quantityValue,
      quantityUnit: input.quantityUnit,
      unitPrice: input.unitPrice,
      categoryId: input.categoryId,
      price: itemTotal(input),
    }))
    enqueue('editar el ítem', {
      kind: 'update',
      table: 'items',
      values: {
        name: input.name,
        quantity: quantity ?? null,
        quantity_value: input.quantityValue ?? null,
        quantity_unit: input.quantityUnit ?? null,
        unit_price: input.unitPrice ?? null,
        category_id: input.categoryId ?? null,
        price: itemTotal(input) ?? null,
      },
      match: { id: itemId },
    })
  }

  function toggleItem(listId: string, itemId: string) {
    const item = findItem(listId, itemId)
    if (!item) return
    const done = !item.done
    updateItemLocal(listId, itemId, (current) => ({ ...current, done }))
    enqueue(`actualizar «${item.name}»`, { kind: 'update', table: 'items', values: { done }, match: { id: itemId } })
  }

  function uncheckAll(listId: string) {
    updateList(listId, (list) => ({ ...list, items: list.items.map((item) => ({ ...item, done: false })) }))
    enqueue('desmarcar los ítems', {
      kind: 'update',
      table: 'items',
      values: { done: false },
      match: { list_id: listId, done: true },
    })
  }

  // Reordena por drag & drop: recibe los ids de un mismo grupo (categoría) en
  // su nuevo orden y les asigna posiciones secuenciales. Las posiciones solo
  // se comparan entre ítems del mismo grupo, así que no importa que se
  // solapen con las de otro grupo.
  function reorderItems(listId: string, orderedItemIds: string[]) {
    const positionById = new Map(orderedItemIds.map((id, index) => [id, index]))
    updateList(listId, (list) => ({
      ...list,
      items: list.items.map((item) =>
        positionById.has(item.id) ? { ...item, position: positionById.get(item.id)! } : item,
      ),
    }))
    orderedItemIds.forEach((id, index) => {
      enqueue('reordenar los ítems', { kind: 'update', table: 'items', values: { position: index }, match: { id } })
    })
  }

  function deleteItem(listId: string, itemId: string) {
    updateList(listId, (list) => ({ ...list, items: list.items.filter((item) => item.id !== itemId) }))
    enqueue(`eliminar «${findItem(listId, itemId)?.name ?? 'Ítem'}»`, { kind: 'delete', table: 'items', match: { id: itemId } })
  }

  /** Elimina los ítems comprados y los devuelve, para poder deshacer. */
  function clearCompleted(listId: string): Item[] {
    const removed = lists.find((list) => list.id === listId)?.items.filter((item) => item.done) ?? []
    if (removed.length === 0) return removed
    updateList(listId, (list) => ({ ...list, items: list.items.filter((item) => !item.done) }))
    enqueue('vaciar los comprados', { kind: 'delete', table: 'items', match: { list_id: listId, done: true } })
    return removed
  }

  function restoreItems(listId: string, items: Item[]) {
    if (items.length === 0) return
    updateList(listId, (list) => ({
      ...list,
      items: [...list.items, ...items].sort((a, b) => a.position - b.position),
    }))
    enqueue('restaurar los ítems', {
      kind: 'upsert',
      table: 'items',
      values: items.map((item) => itemToRow(listId, item)),
    })
  }

  // Borra de Storage la foto anterior de un ítem una vez enviado el cambio
  // que deja de usarla (deleteItemImage verifica que nadie más la use).
  function cleanupPreviousImage(itemId: string, previousImageUrl: string | undefined) {
    if (!previousImageUrl) return
    void whenOutboxIdle().then(() => deleteItemImage(userId, itemId, previousImageUrl))
  }

  function setItemImage(listId: string, itemId: string, imageUrl: string | undefined) {
    if (getOutboxUser() !== userId || isFinishQueued(listId) || !listsRef.current.some((list) => list.id === listId && list.items.some((item) => item.id === itemId))) return
    const previousImageUrl = findItem(listId, itemId)?.imageUrl
    updateItemLocal(listId, itemId, (item) => ({ ...item, imageUrl }))
    enqueue('guardar la foto del ítem', {
      kind: 'update',
      table: 'items',
      values: { image_url: imageUrl ?? null },
      match: { id: itemId },
    })
    if (!imageUrl) cleanupPreviousImage(itemId, previousImageUrl)
  }

  // Elige a mano uno de los íconos del catálogo para el ítem, en reemplazo de
  // la foto propia (si tenía una, se borra de Storage) o de la detección
  // automática por nombre.
  function setItemIcon(listId: string, itemId: string, iconKey: string | undefined) {
    if (getOutboxUser() !== userId || isFinishQueued(listId) || !listsRef.current.some((list) => list.id === listId && list.items.some((item) => item.id === itemId))) return
    const previousImageUrl = findItem(listId, itemId)?.imageUrl
    updateItemLocal(listId, itemId, (item) => ({ ...item, iconKey, imageUrl: undefined }))
    enqueue('guardar el ícono del ítem', {
      kind: 'update',
      table: 'items',
      values: { icon_key: iconKey ?? null, image_url: null },
      match: { id: itemId },
    })
    cleanupPreviousImage(itemId, previousImageUrl)
  }

  return {
    lists,
    loading,
    createList,
    duplicateList,
    createListFromTemplate,
    toggleTemplate,
    deleteList,
    restoreList,
    updateListName,
    setListBudget,
    setListCurrency,
    archiveLocally,
    repeatPurchase,
    importBackup,
    addItem,
    updateItem,
    toggleItem,
    uncheckAll,
    reorderItems,
    deleteItem,
    clearCompleted,
    restoreItems,
    setItemImage,
    setItemIcon,
  }
}
