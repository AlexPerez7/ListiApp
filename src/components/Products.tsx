import { useMemo, useState, type FormEvent } from 'react'
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
  const [query, setQuery] = useState('')
  const [editingEntry, setEditingEntry] = useState<ProductCatalogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [iconDraft, setIconDraft] = useState(ALL_ICON_KEYS[0])

  const filteredCatalog = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return catalog
    return catalog.filter((entry) => entry.name.toLowerCase().includes(trimmed))
  }, [catalog, query])

  function openCreateSheet() {
    setEditingEntry(null)
    setNameDraft('')
    setIconDraft(ALL_ICON_KEYS[0])
    setSheetOpen(true)
  }

  function openEditSheet(entry: ProductCatalogEntry) {
    setEditingEntry(entry)
    setNameDraft(entry.name)
    setIconDraft(entry.iconKey)
    setSheetOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    if (editingEntry) {
      onUpdate(editingEntry.id, trimmed, iconDraft)
    } else {
      onCreate(trimmed, iconDraft)
    }
    setSheetOpen(false)
  }

  async function handleDelete() {
    if (!editingEntry) return
    if (await onConfirm(`¿Eliminar "${editingEntry.name}" del catálogo de productos?`)) {
      onDelete(editingEntry.id)
      setSheetOpen(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Productos</h1>
        <p className={styles.subtitle}>El ícono que se sugiere automáticamente al escribir un ítem</p>
      </header>

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
            <li key={entry.id} className={styles.row}>
              <button className={styles.rowButton} onClick={() => openEditSheet(entry)}>
                <ProductIcon iconKey={entry.iconKey} size={40} className={styles.rowIcon} />
                <span className={styles.rowName}>{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.fabLayer}>
        <button className={styles.fab} onClick={openCreateSheet} aria-label="Agregar producto">
          <Icon name="plus" size={26} />
        </button>
      </div>

      {sheetOpen && (
        <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)}>
          <form className={styles.sheet} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>{editingEntry ? 'Editar producto' : 'Nuevo producto'}</h2>
            <input
              className={styles.input}
              type="text"
              placeholder="Nombre del producto (ej: kiwi)"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
            />
            <div className={styles.iconGrid}>
              {ALL_ICON_KEYS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.iconGridOption} ${option === iconDraft ? styles.iconGridOptionSelected : ''}`}
                  onClick={() => setIconDraft(option)}
                  aria-label={`Usar ícono ${option}`}
                  aria-pressed={option === iconDraft}
                >
                  <ProductIcon iconKey={option} size={24} />
                </button>
              ))}
            </div>
            {editingEntry && (
              <button type="button" className={styles.deleteButton} onClick={handleDelete}>
                Eliminar producto
              </button>
            )}
            <div className={styles.sheetActions}>
              <button type="button" className={styles.sheetCancelButton} onClick={() => setSheetOpen(false)}>
                Cancelar
              </button>
              <button className={styles.sheetSaveButton} type="submit" disabled={!nameDraft.trim()}>
                {editingEntry ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
