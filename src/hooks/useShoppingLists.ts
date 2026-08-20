import { useEffect, useState } from 'react'
import { loadLists, saveLists } from '../storage'
import type { Item, ShoppingList } from '../types'

function createId(): string {
  return crypto.randomUUID()
}

export function useShoppingLists() {
  const [lists, setLists] = useState<ShoppingList[]>(() => loadLists())

  useEffect(() => {
    saveLists(lists)
  }, [lists])

  function createList(name: string): string {
    const id = createId()
    const newList: ShoppingList = {
      id,
      name,
      items: [],
      createdAt: Date.now(),
    }
    setLists((prev) => [newList, ...prev])
    return id
  }

  function deleteList(listId: string) {
    setLists((prev) => prev.filter((list) => list.id !== listId))
  }

  function addItem(listId: string, name: string, quantity?: string) {
    const newItem: Item = {
      id: createId(),
      name,
      quantity: quantity?.trim() || undefined,
      done: false,
      createdAt: Date.now(),
    }
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, items: [...list.items, newItem] } : list,
      ),
    )
  }

  function toggleItem(listId: string, itemId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item,
              ),
            }
          : list,
      ),
    )
  }

  function deleteItem(listId: string, itemId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
          : list,
      ),
    )
  }

  return { lists, createList, deleteList, addItem, toggleItem, deleteItem }
}
