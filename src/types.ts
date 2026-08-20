export interface Item {
  id: string
  name: string
  quantity?: string
  price?: number
  category?: string
  done: boolean
  position: number
  createdAt: number
}

export interface ShoppingList {
  id: string
  name: string
  items: Item[]
  createdAt: number
}
