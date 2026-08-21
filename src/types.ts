export interface Item {
  id: string
  name: string
  quantity?: string
  price?: number
  categoryId?: string
  imageUrl?: string
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
}

export interface Category {
  id: string
  name: string
  icon: string
  position: number
}
