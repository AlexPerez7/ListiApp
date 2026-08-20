import { useState, type FormEvent } from 'react'
import type { ShoppingList } from '../types'
import styles from './Home.module.css'

interface HomeProps {
  lists: ShoppingList[]
  onCreateList: (name: string) => void
  onSelectList: (id: string) => void
  onDeleteList: (id: string) => void
}

export function Home({ lists, onCreateList, onSelectList, onDeleteList }: HomeProps) {
  const [name, setName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreateList(trimmed)
    setName('')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ListiApp</h1>
        <p className={styles.subtitle}>Tus listas de compras</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Nueva lista (ej: Súper semanal)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className={styles.addButton} type="submit" disabled={!name.trim()}>
          Crear
        </button>
      </form>

      {lists.length === 0 ? (
        <div className={styles.empty}>
          <p>Todavía no tenés listas.</p>
          <p>Creá la primera arriba.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {lists.map((list) => {
            const total = list.items.length
            const done = list.items.filter((item) => item.done).length
            return (
              <li key={list.id} className={styles.card}>
                <button className={styles.cardMain} onClick={() => onSelectList(list.id)}>
                  <span className={styles.cardName}>{list.name}</span>
                  <span className={styles.cardMeta}>
                    {total === 0 ? 'Sin ítems' : `${done} de ${total} comprados`}
                  </span>
                </button>
                <button
                  className={styles.deleteButton}
                  aria-label={`Eliminar lista ${list.name}`}
                  onClick={() => {
                    if (confirm(`¿Eliminar la lista "${list.name}"?`)) {
                      onDeleteList(list.id)
                    }
                  }}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
