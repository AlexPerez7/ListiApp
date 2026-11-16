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
  currency?: string
}

export type PurchaseItem = Pick<Item, 'id' | 'name' | 'quantity' | 'quantityValue' | 'quantityUnit' | 'unitPrice' | 'price' | 'iconKey' | 'done' | 'position'> & { categoryName?: string }

export interface Purchase {
  id: string
  name: string
  completedAt: number
  currency: string
  total: number
  purchasedCount: number
  unpricedCount: number
  budget?: number
  budgetCurrency?: string
  items: PurchaseItem[]
  pending?: boolean
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
