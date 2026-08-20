import { memo, useCallback, useMemo, useState, type FormEvent } from 'react'
import type { ShoppingList } from '../types'
import type { Theme } from '../lib/theme'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SkeletonList } from './Skeleton'
import styles from './Home.module.css'

interface HomeProps {
  lists: ShoppingList[]
  loading: boolean
  theme: Theme
  onToggleTheme: () => void
  onCreateList: (name: string) => void
  onSelectList: (id: string) => void
  onDuplicateList: (id: string) => void
  onDeleteList: (id: string) => void
  onSignOut: () => void
}

export function Home({
  lists,
  loading,
  theme,
  onToggleTheme,
  onCreateList,
  onSelectList,
  onDuplicateList,
  onDeleteList,
  onSignOut,
}: HomeProps) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreateList(trimmed)
    setName('')
  }

  const handleSelectList = useCallback((id: string) => onSelectList(id), [onSelectList])
  const handleDuplicateList = useCallback((id: string) => onDuplicateList(id), [onDuplicateList])
  const handleDeleteList = useCallback((id: string) => onDeleteList(id), [onDeleteList])

  const filteredLists = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return lists
    return lists.filter((list) => list.name.toLowerCase().includes(trimmed))
  }, [lists, query])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo size={36} className={styles.logo} />
          <div>
            <h1 className={styles.title}>ListiApp</h1>
            <p className={styles.subtitle}>Tus listas de compras</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.themeButton}
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
          <button className={styles.signOutButton} onClick={onSignOut}>
            Salir
          </button>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Nueva lista (ej: Súper semanal)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className={styles.addButton} type="submit" disabled={!name.trim()} aria-label="Crear lista">
          <Icon name="plus" size={22} />
        </button>
      </form>

      {lists.length > 0 && (
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar lista…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar lista"
        />
      )}

      {loading ? (
        <SkeletonList />
      ) : lists.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="list" size={40} className={styles.emptyIcon} />
          <p>Todavía no tienes listas.</p>
          <p>Crea la primera arriba.</p>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className={styles.empty}>
          <p>Ninguna lista coincide con "{query}".</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredLists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onSelect={handleSelectList}
              onDuplicate={handleDuplicateList}
              onDelete={handleDeleteList}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface ListCardProps {
  list: ShoppingList
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

const ListCard = memo(function ListCard({ list, onSelect, onDuplicate, onDelete }: ListCardProps) {
  const total = list.items.length
  const done = useMemo(() => list.items.filter((item) => item.done).length, [list.items])

  return (
    <li className={styles.card}>
      <button className={styles.cardMain} onClick={() => onSelect(list.id)}>
        <span className={styles.cardName}>{list.name}</span>
        <span className={styles.cardMeta}>{total === 0 ? 'Sin ítems' : `${done} de ${total} comprados`}</span>
      </button>
      <button
        className={styles.duplicateButton}
        aria-label={`Duplicar lista ${list.name}`}
        onClick={() => onDuplicate(list.id)}
      >
        <Icon name="duplicate" size={17} />
      </button>
      <button
        className={styles.deleteButton}
        aria-label={`Eliminar lista ${list.name}`}
        onClick={() => {
          if (confirm(`¿Eliminar la lista "${list.name}"?`)) {
            onDelete(list.id)
          }
        }}
      >
        <Icon name="close" size={17} />
      </button>
    </li>
  )
})
