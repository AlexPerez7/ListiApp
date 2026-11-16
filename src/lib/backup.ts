import type { Category, ShoppingList } from '../types'

export interface BackupItem {
  name: string
  quantity?: string
  price?: number
  categoryName?: string
  imageUrl?: string
  iconKey?: string
  done: boolean
}

export interface BackupList {
  name: string
  isTemplate?: boolean
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
      isTemplate: list.isTemplate || undefined,
      items: [...list.items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          categoryName: item.categoryId ? categoriesById.get(item.categoryId)?.name : undefined,
          imageUrl: item.imageUrl,
          iconKey: item.iconKey,
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
  a.download = `listiapp-respaldo-${date}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const MAX_NAME_LENGTH = 200

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_NAME_LENGTH) : undefined
}

function parseItem(raw: unknown): BackupItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const name = optionalText(item.name)
  if (!name) return null
  const price = typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 ? item.price : undefined
  const imageUrl = typeof item.imageUrl === 'string' && /^https:\/\//.test(item.imageUrl) ? item.imageUrl : undefined
  return {
    name,
    quantity: optionalText(item.quantity),
    price,
    categoryName: optionalText(item.categoryName),
    imageUrl,
    iconKey: optionalText(item.iconKey),
    done: item.done === true,
  }
}

// Valida y normaliza el archivo: descarta lo que no tenga la forma esperada
// en vez de confiar en el contenido tal cual viene.
export function parseBackup(raw: string): BackupPayload {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }

  const rawLists = data && typeof data === 'object' ? (data as { lists?: unknown }).lists : undefined
  if (!Array.isArray(rawLists)) {
    throw new Error('El archivo no tiene el formato de respaldo de ListiApp.')
  }

  const lists: BackupList[] = []
  for (const rawList of rawLists) {
    if (!rawList || typeof rawList !== 'object') continue
    const list = rawList as Record<string, unknown>
    const name = optionalText(list.name)
    if (!name || !Array.isArray(list.items)) continue
    lists.push({
      name,
      isTemplate: list.isTemplate === true,
      items: list.items.map(parseItem).filter((item): item is BackupItem => item !== null),
    })
  }

  if (lists.length === 0) {
    throw new Error('El archivo no contiene listas para importar.')
  }

  return { version: 1, exportedAt: new Date().toISOString(), lists }
}
