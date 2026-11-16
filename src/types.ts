export interface Item {
  id: string
  name: string
  quantity?: string
  quantityValue?: number
  quantityUnit?: QuantityUnit
  unitPrice?: number
  price?: number
  categoryId?: string
  imageUrl?: string
  iconKey?: string
  done: boolean
  position: number
  createdAt: number
}

export interface ShoppingList {
  id: string
  name: string
  items: Item[]
  createdAt: number
  isTemplate: boolean
  budget?: number
  budgetCurrency?: string
}

export type QuantityUnit = 'unit' | 'kg' | 'g' | 'l' | 'ml'

export interface Category {
  id: string
  name: string
  icon: string
  position: number
}

export interface ProductCatalogEntry {
  id: string
  name: string
  iconKey: string
  imageUrl?: string
}
