import type { Category, ShoppingList } from '../types'

export interface BackupItem {
  name: string
  quantity?: string
  price?: number
  categoryName?: string
  imageUrl?: string
  done: boolean
}

export interface BackupList {
  name: string
  items: BackupItem[]
}

export interface BackupPayload {
  version: 1
  exportedAt: string
  lists: BackupList[]
}

export function buildBackup(lists: ShoppingList[], categories: Category[]): BackupPayload {
  const categoriesById = new Map(categories.map((c) => [c.id, c]))

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    lists: lists.map((list) => ({
      name: list.name,
      items: [...list.items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          categoryName: item.categoryId ? categoriesById.get(item.categoryId)?.name : undefined,
          imageUrl: item.imageUrl,
          done: item.done,
        })),
    })),
  }
}

export function downloadBackup(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `listiapp-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseBackup(raw: string): BackupPayload {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }

  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as BackupPayload).lists) ||
    !(data as BackupPayload).lists.every(
      (list) => list && typeof list.name === 'string' && Array.isArray(list.items),
    )
  ) {
    throw new Error('El archivo no tiene el formato de backup de ListiApp.')
  }

  return data as BackupPayload
}
