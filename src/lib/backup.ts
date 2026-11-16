import type { Category, ProductCatalogEntry, ShoppingList } from '../types'
import type { Prefs } from './prefs'

export interface BackupProduct {
  name: string
  iconKey: string
  imageUrl?: string
}

export interface BackupPhoto {
  nameKey: string
  imageUrl: string
}

export type BackupCategory = Pick<Category, 'name' | 'icon' | 'position'>

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
  version: 1 | 2
  exportedAt: string
  lists: BackupList[]
  categories?: BackupCategory[]
  catalog?: BackupProduct[]
  preferences?: Prefs
  productPhotos?: BackupPhoto[]
  /** URL original -> copia portable de la imagen. */
  images?: Record<string, string>
}

export function buildBackup(
  lists: ShoppingList[], categories: Category[],
  options: { catalog?: ProductCatalogEntry[]; preferences?: Prefs; productPhotos?: BackupPhoto[] } = {},
): BackupPayload {
  const categoriesById = new Map(categories.map((c) => [c.id, c]))

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    categories: [...categories].sort((a, b) => a.position - b.position)
      .map(({ name, icon, position }) => ({ name, icon, position })),
    catalog: options.catalog?.map(({ name, iconKey, imageUrl }) => ({ name, iconKey, imageUrl })) ?? [],
    preferences: options.preferences,
    productPhotos: options.productPhotos ?? [],
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
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function imageLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    return new URL(value).protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_NAME_LENGTH) : undefined
}

function parseItem(raw: unknown): BackupItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const name = optionalText(item.name)
  if (!name) return null
  const price = typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 ? item.price : undefined
  const imageUrl = imageLink(item.imageUrl)
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
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) {
    throw new Error('El respaldo supera el límite de 25 MB.')
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }

  const source = isRecord(data) ? data : {}
  if (source.version !== undefined && source.version !== 1 && source.version !== 2) {
    throw new Error('Esta versión de respaldo no es compatible. Actualiza la app.')
  }
  const rawLists = source.lists
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

  const categories: BackupCategory[] = []
  const catalog: BackupProduct[] = []
  const productPhotos: BackupPhoto[] = []
  const images: Record<string, string> = Object.create(null) as Record<string, string>
  let preferences: Prefs | undefined
  if (source.version === 2) {
    for (const entry of Array.isArray(source.categories) ? source.categories : []) {
      if (!isRecord(entry)) continue
      const name = optionalText(entry.name)
      const icon = optionalText(entry.icon)
      if (name && icon) categories.push({ name, icon, position: categories.length })
    }
    for (const entry of Array.isArray(source.catalog) ? source.catalog : []) {
      if (!isRecord(entry)) continue
      const name = optionalText(entry.name)
      const iconKey = optionalText(entry.iconKey)
      if (name && iconKey) catalog.push({ name, iconKey, imageUrl: imageLink(entry.imageUrl) })
    }
    for (const entry of Array.isArray(source.productPhotos) ? source.productPhotos : []) {
      if (!isRecord(entry)) continue
      const nameKey = optionalText(entry.nameKey)
      const imageUrl = imageLink(entry.imageUrl)
      if (nameKey && imageUrl) productPhotos.push({ nameKey, imageUrl })
    }
    if (isRecord(source.preferences)) {
      const { theme, currency } = source.preferences
      if ((theme === 'light' || theme === 'dark' || theme === 'system') &&
        typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) preferences = { theme, currency }
    }
    if (isRecord(source.images)) {
      for (const [url, value] of Object.entries(source.images)) {
        if (!imageLink(url) || typeof value !== 'string' || value.length > 1_400_000 ||
          !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
          throw new Error('El respaldo contiene una copia de imagen inválida.')
        }
        images[url] = value
      }
    }
  }

  if (lists.length === 0 && categories.length === 0 && catalog.length === 0 && !preferences && productPhotos.length === 0) {
    throw new Error('El archivo no contiene listas para importar.')
  }

  return {
    version: source.version === 2 ? 2 : 1, exportedAt: new Date().toISOString(), lists,
    categories, catalog, preferences, productPhotos, images,
  }
}
