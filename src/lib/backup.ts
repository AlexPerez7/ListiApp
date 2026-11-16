import type { Category, ProductCatalogEntry, Purchase, ShoppingList } from '../types'
import type { Prefs } from './prefs'
import { CURRENCIES } from './currencies'
import { calculateSubtotal, formatQuantity, isQuantityUnit } from './pricing'
import type { QuantityUnit } from '../types'

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
  quantityValue?: number
  quantityUnit?: QuantityUnit
  unitPrice?: number
  price?: number
  categoryName?: string
  imageUrl?: string
  iconKey?: string
  done: boolean
}

export interface BackupList {
  name: string
  isTemplate?: boolean
  budget?: number
  budgetCurrency?: string
  currency?: string
  items: BackupItem[]
}

export interface BackupPayload {
  version: 1 | 2 | 3 | 4
  purchases?: Purchase[]
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
  options: { catalog?: ProductCatalogEntry[]; preferences?: Prefs; productPhotos?: BackupPhoto[]; purchases?: Purchase[] } = {},
): BackupPayload {
  const categoriesById = new Map(categories.map((c) => [c.id, c]))

  return {
    version: 4,
    purchases: options.purchases?.map((entry) => ({ ...entry, pending: undefined })) ?? [],
    exportedAt: new Date().toISOString(),
    categories: [...categories].sort((a, b) => a.position - b.position)
      .map(({ name, icon, position }) => ({ name, icon, position })),
    catalog: options.catalog?.map(({ name, iconKey, imageUrl }) => ({ name, iconKey, imageUrl })) ?? [],
    preferences: options.preferences,
    productPhotos: options.productPhotos ?? [],
    lists: lists.map((list) => ({
      name: list.name,
      isTemplate: list.isTemplate || undefined,
      budget: list.budget,
      budgetCurrency: list.budgetCurrency,
      currency: list.currency,
      items: [...list.items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          unitPrice: item.unitPrice,
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
  let numeric: Pick<BackupItem, 'quantityValue' | 'quantityUnit' | 'unitPrice'> = {}
  if (item.quantityValue !== undefined || item.quantityUnit !== undefined || item.unitPrice !== undefined) {
    const amount = item.quantityValue
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 ||
      Math.abs(amount * 1000 - Math.round(amount * 1000)) > 0.000001 || !isQuantityUnit(item.quantityUnit)) {
      throw new Error('El respaldo contiene una cantidad o unidad inválida.')
    }
    const unitPrice = item.unitPrice
    if (unitPrice !== undefined && (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice >= 100_000_000 ||
      Math.abs(unitPrice * 100 - Math.round(unitPrice * 100)) > 0.000001)) throw new Error('El respaldo contiene un precio unitario inválido.')
    numeric = { quantityValue: amount, quantityUnit: item.quantityUnit, unitPrice: unitPrice as number | undefined }
  }
  const total = numeric.unitPrice !== undefined ? calculateSubtotal(numeric.quantityValue!, numeric.unitPrice) : price
  if (total !== undefined && total >= 100_000_000) throw new Error('El respaldo contiene un subtotal fuera del límite permitido.')
  const imageUrl = imageLink(item.imageUrl)
  return {
    name,
    quantity: numeric.quantityValue !== undefined ? formatQuantity(numeric.quantityValue, numeric.quantityUnit!) : optionalText(item.quantity),
    ...numeric,
    price: total,
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
  if (source.version !== undefined && source.version !== 1 && source.version !== 2 && source.version !== 3 && source.version !== 4) {
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
    let budget: number | undefined
    let budgetCurrency: string | undefined
    if (list.budget !== undefined) {
      if (typeof list.budget !== 'number' || !Number.isFinite(list.budget) || list.budget < 0 || list.budget >= 100_000_000 ||
        !CURRENCIES.some((entry) => entry.code === list.budgetCurrency)) throw new Error('El respaldo contiene un presupuesto inválido.')
      budget = list.budget
      budgetCurrency = list.budgetCurrency as string
    }
    if (list.currency !== undefined && !CURRENCIES.some((entry) => entry.code === list.currency)) throw new Error("El respaldo contiene una moneda inválida.")
    lists.push({
      name,
      isTemplate: list.isTemplate === true,
      budget,
      budgetCurrency,
      currency: list.currency as string | undefined,
      items: list.items.map(parseItem).filter((item): item is BackupItem => item !== null),
    })
  }

  const categories: BackupCategory[] = []
  const catalog: BackupProduct[] = []
  const productPhotos: BackupPhoto[] = []
  const images: Record<string, string> = Object.create(null) as Record<string, string>
  let preferences: Prefs | undefined
  if (source.version === 2 || source.version === 3 || source.version === 4) {
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

  const purchases: Purchase[] = []
  for (const raw of source.version === 4 && Array.isArray(source.purchases) ? source.purchases : []) {
    if (!isRecord(raw) || !optionalText(raw.name) || !CURRENCIES.some((entry) => entry.code === raw.currency) ||
      typeof raw.completedAt !== 'number' || !Number.isFinite(raw.completedAt) || !Number.isFinite(new Date(raw.completedAt).getTime()) ||
      !Array.isArray(raw.items) || raw.items.length > 10000) throw new Error('El respaldo contiene una compra inválida.')
    const items = raw.items.map((value, index) => {
      const item = parseItem(value)
      if (!item || !isRecord(value) || typeof value.done !== 'boolean') throw new Error('El historial contiene un producto inválido.')
      if (item.price !== undefined && Math.abs(item.price * 100 - Math.round(item.price * 100)) > 0.000001) throw new Error('El historial contiene un precio inválido.')
      return { id: crypto.randomUUID(), name: item.name, quantity: item.quantity, quantityValue: item.quantityValue,
        quantityUnit: item.quantityUnit, unitPrice: item.unitPrice, price: item.price, done: item.done,
        iconKey: item.iconKey, categoryName: item.categoryName, position: index }
    })
    const bought = items.filter((item) => item.done)
    if (!bought.length) throw new Error('Una compra del historial no tiene productos comprados.')
    if (raw.budget !== undefined && (typeof raw.budget !== 'number' || !Number.isFinite(raw.budget) || raw.budget < 0 ||
      raw.budget >= 100_000_000 || !CURRENCIES.some((entry) => entry.code === raw.budgetCurrency))) throw new Error('El historial contiene un presupuesto inválido.')
    purchases.push({ id: crypto.randomUUID(), name: optionalText(raw.name)!, currency: raw.currency as string, completedAt: raw.completedAt,
      total: Math.round(bought.reduce((sum, item) => sum + (item.price ?? 0), 0) * 100) / 100,
      purchasedCount: bought.length, unpricedCount: bought.filter((item) => item.price === undefined).length,
      items, budget: raw.budget as number | undefined, budgetCurrency: raw.budget === undefined ? undefined : raw.budgetCurrency as string })
  }

  if (lists.length === 0 && categories.length === 0 && catalog.length === 0 && !preferences && productPhotos.length === 0 && purchases.length === 0) {
    throw new Error('El archivo no contiene listas para importar.')
  }

  return {
    purchases, version: source.version === 4 ? 4 : source.version === 3 ? 3 : source.version === 2 ? 2 : 1, exportedAt: new Date().toISOString(), lists,
    categories, catalog, preferences, productPhotos, images,
  }
}
