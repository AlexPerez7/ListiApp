import { memo, useMemo, useState, type FormEvent } from 'react'
import type { ProductCatalogEntry } from '../types'
import { ALL_ICON_KEYS } from '../lib/productIcons'
import { ProductIcon } from './ProductIcon'
import { Icon } from './Icon'
import { SkeletonList } from './Skeleton'
import styles from './Products.module.css'

interface ProductsProps {
  catalog: ProductCatalogEntry[]
  loading: boolean
  onCreate: (name: string, iconKey: string) => void
  onUpdate: (entryId: string, name: string, iconKey: string) => void
  onDelete: (entryId: string) => void
  onConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
}

export function Products({ catalog, loading, onCreate, onUpdate, onDelete, onConfirm }: ProductsProps) {
  const [name, setName] = useState('')
  const [iconKey, setIconKey] = useState(ALL_ICON_KEYS[0])
  const [query, setQuery] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, iconKey)
    setName('')
    setIconKey(ALL_ICON_KEYS[0])
  }

  const filteredCatalog = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return catalog
    return catalog.filter((entry) => entry.name.toLowerCase().includes(trimmed))
  }, [catalog, query])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Productos</h1>
        <p className={styles.subtitle}>El ícono que se sugiere automáticamente al escribir un ítem</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.iconPicker}>
          {ALL_ICON_KEYS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.iconOption} ${option === iconKey ? styles.iconOptionSelected : ''}`}
              onClick={() => setIconKey(option)}
              aria-label={`Usar ícono ${option}`}
              aria-pressed={option === iconKey}
            >
              <ProductIcon iconKey={option} size={22} />
            </button>
          ))}
        </div>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Nuevo producto (ej: kiwi)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className={styles.addButton} type="submit" disabled={!name.trim()}>
            Crear
          </button>
        </div>
      </form>

      {catalog.length > 5 && (
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar producto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar producto"
        />
      )}

      {loading ? (
        <SkeletonList count={4} />
      ) : catalog.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="tag" size={40} className={styles.emptyIcon} />
          <p>Todavía no tienes productos.</p>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className={styles.empty}>
          <p>Ningún producto coincide con "{query}".</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredCatalog.map((entry) => (
            <ProductRow key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} onConfirm={onConfirm} />
          ))}
        </ul>
      )}
    </div>
  )
}

interface ProductRowProps {
  entry: ProductCatalogEntry
  onUpdate: (entryId: string, name: string, iconKey: string) => void
  onDelete: (entryId: string) => void
  onConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
}

const ProductRow = memo(function ProductRow({ entry, onUpdate, onDelete, onConfirm }: ProductRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(entry.name)
  const [iconDraft, setIconDraft] = useState(entry.iconKey)

  function startEditing() {
    setNameDraft(entry.name)
    setIconDraft(entry.iconKey)
    setEditing(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    onUpdate(entry.id, trimmed, iconDraft)
    setEditing(false)
  }

  async function handleDelete() {
    if (await onConfirm(`¿Eliminar "${entry.name}" del catálogo de productos?`)) {
      onDelete(entry.id)
    }
  }

  if (editing) {
    return (
      <li className={styles.card}>
        <form className={styles.editForm} onSubmit={handleSubmit}>
          <div className={styles.iconPicker}>
            {ALL_ICON_KEYS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.iconOption} ${option === iconDraft ? styles.iconOptionSelected : ''}`}
                onClick={() => setIconDraft(option)}
                aria-label={`Usar ícono ${option}`}
                aria-pressed={option === iconDraft}
              >
                <ProductIcon iconKey={option} size={22} />
              </button>
            ))}
          </div>
          <div className={styles.formRow}>
            <input className={styles.input} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus />
          </div>
          <div className={styles.editActions}>
            <button className={styles.editCancelButton} type="button" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className={styles.editSaveButton} type="submit" disabled={!nameDraft.trim()}>
              Guardar
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={styles.card}>
      <button className={styles.cardMain} onClick={startEditing}>
        <ProductIcon iconKey={entry.iconKey} size={22} className={styles.cardIcon} />
        <span className={styles.cardName}>{entry.name}</span>
      </button>
      <button className={styles.deleteButton} aria-label={`Eliminar ${entry.name}`} onClick={handleDelete}>
        <Icon name="close" size={17} />
      </button>
    </li>
  )
})
