export interface Item {
  id: string
  name: string
  quantity?: string
  done: boolean
  createdAt: number
}

export interface ShoppingList {
  id: string
  name: string
  items: Item[]
  createdAt: number
}
