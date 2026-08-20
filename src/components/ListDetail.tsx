import { useState, type FormEvent } from 'react'
import type { Item, ShoppingList } from '../types'
import styles from './ListDetail.module.css'

interface ListDetailProps {
  list: ShoppingList
  onBack: () => void
  onAddItem: (name: string, quantity?: string) => void
  onToggleItem: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onDeleteList: () => void
}

export function ListDetail({
  list,
  onBack,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onDeleteList,
}: ListDetailProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAddItem(trimmed, quantity)
    setName('')
    setQuantity('')
  }

  const pending = list.items.filter((item) => !item.done)
  const done = list.items.filter((item) => item.done)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack} aria-label="Volver a mis listas">
          ←
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{list.name}</h1>
          <p className={styles.subtitle}>
            {list.items.length === 0
              ? 'Sin ítems todavía'
              : `${done.length} de ${list.items.length} comprados`}
          </p>
        </div>
        <button
          className={styles.deleteListButton}
          aria-label="Eliminar lista"
          onClick={() => {
            if (confirm(`¿Eliminar la lista "${list.name}"?`)) {
              onDeleteList()
            }
          }}
        >
          ✕
        </button>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.inputName}
          type="text"
          placeholder="Ítem (ej: Leche)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.inputQty}
          type="text"
          placeholder="Cant."
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <button className={styles.addButton} type="submit" disabled={!name.trim()} aria-label="Agregar ítem">
          +
        </button>
      </form>

      {list.items.length === 0 ? (
        <div className={styles.empty}>
          <p>Agregá tu primer ítem arriba.</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {pending.length > 0 && (
            <ul className={styles.itemList}>
              {pending.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggleItem(item.id)}
                  onDelete={() => onDeleteItem(item.id)}
                />
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <div className={styles.doneSection}>
              <p className={styles.doneLabel}>Comprados</p>
              <ul className={styles.itemList}>
                {done.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => onToggleItem(item.id)}
                    onDelete={() => onDeleteItem(item.id)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ItemRowProps {
  item: Item
  onToggle: () => void
  onDelete: () => void
}

function ItemRow({ item, onToggle, onDelete }: ItemRowProps) {
  return (
    <li className={`${styles.item} ${item.done ? styles.itemDone : ''}`}>
      <button
        className={styles.checkbox}
        onClick={onToggle}
        aria-label={item.done ? 'Marcar como pendiente' : 'Marcar como comprado'}
      >
        {item.done && <span className={styles.checkmark}>✓</span>}
      </button>
      <button className={styles.itemMain} onClick={onToggle}>
        <span className={styles.itemName}>{item.name}</span>
        {item.quantity && <span className={styles.itemQty}>{item.quantity}</span>}
      </button>
      <button className={styles.itemDelete} onClick={onDelete} aria-label={`Eliminar ${item.name}`}>
        ✕
      </button>
    </li>
  )
}
