import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { ProductCatalogEntry } from '../types'
import { ALL_ICON_KEYS } from '../lib/productIcons'
import { describeUploadError } from '../lib/imageUpload'
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
  onUploadImage: (entryId: string, file: File) => Promise<void>
  onRemoveImage: (entryId: string) => void
  onConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
}

export function Products({
  catalog,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onUploadImage,
  onRemoveImage,
  onConfirm,
}: ProductsProps) {
  const [query, setQuery] = useState('')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [iconDraft, setIconDraft] = useState(ALL_ICON_KEYS[0])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editingEntry = useMemo(
    () => catalog.find((entry) => entry.id === editingEntryId) ?? null,
    [catalog, editingEntryId],
  )

  const filteredCatalog = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return catalog
    return catalog.filter((entry) => entry.name.toLowerCase().includes(trimmed))
  }, [catalog, query])

  function openCreateSheet() {
    setEditingEntryId(null)
    setNameDraft('')
    setIconDraft(ALL_ICON_KEYS[0])
    setImageError(null)
    setSheetOpen(true)
  }

  function openEditSheet(entry: ProductCatalogEntry) {
    setEditingEntryId(entry.id)
    setNameDraft(entry.name)
    setIconDraft(entry.iconKey)
    setImageError(null)
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

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editingEntry) return
    setUploadingImage(true)
    setImageError(null)
    try {
      await onUploadImage(editingEntry.id, file)
    } catch (err) {
      setImageError(describeUploadError(err))
    } finally {
      setUploadingImage(false)
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
                {entry.imageUrl ? (
                  <img src={entry.imageUrl} alt="" className={styles.rowImg} />
                ) : (
                  <ProductIcon iconKey={entry.iconKey} size={40} className={styles.rowIcon} />
                )}
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

            {editingEntry && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                  hidden
                />
                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Icon name="upload" size={16} />
                  {uploadingImage ? 'Subiendo…' : editingEntry.imageUrl ? 'Cambiar foto' : 'Subir una foto'}
                </button>
                {imageError && <p className={styles.imageError}>{imageError}</p>}
                {editingEntry.imageUrl && (
                  <button
                    type="button"
                    className={styles.removePhotoButton}
                    onClick={() => onRemoveImage(editingEntry.id)}
                  >
                    Quitar foto y usar ícono
                  </button>
                )}
              </>
            )}

            <p className={styles.iconLabel}>{editingEntry?.imageUrl ? 'O elige un ícono' : 'Elige un ícono'}</p>
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
