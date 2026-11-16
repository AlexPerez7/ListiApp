import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { ProductCatalogEntry } from '../types'
import { ALL_ICON_KEYS } from '../lib/productIcons'
import { missingDefaultProducts, normalizeProductName } from '../lib/productCatalog'
import { describeUploadError } from '../lib/imageUpload'
import { confirmDialog } from '../lib/confirm'
import { BottomSheet } from './BottomSheet'
import { ProductIcon } from './ProductIcon'
import { ProductPhoto } from './ProductPhoto'
import { Icon } from './Icon'
import { ProductIconGrid } from './Pickers'
import { SkeletonList } from './Skeleton'
import styles from './Products.module.css'
import { matchesProductSearch } from '../lib/search'

interface ProductsProps {
  catalog: ProductCatalogEntry[]
  loading: boolean
  onCreate: (name: string, iconKey: string) => void
  onUpdate: (entryId: string, name: string, iconKey: string) => void
  onDelete: (entryId: string) => void
  onUploadImage: (entryId: string, file: File) => Promise<void>
  onRemoveImage: (entryId: string) => void
  onAddDefaults: () => void
}

export function Products({ catalog, loading, onCreate, onUpdate, onDelete, onUploadImage, onRemoveImage, onAddDefaults }: ProductsProps) {
  const [query, setQuery] = useState('')
  // null = cerrado, 'new' = creando, otro valor = id del producto en edición
  const [sheet, setSheet] = useState<string | null>(null)
  const missingDefaults = missingDefaultProducts(catalog).length

  const filteredCatalog = useMemo(() => {
    const needle = normalizeProductName(query)
    if (!needle) return catalog
    return catalog.filter((entry) => matchesProductSearch(entry.name, needle))
  }, [catalog, query])

  const editing = sheet && sheet !== 'new' ? catalog.find((entry) => entry.id === sheet) : undefined

  function nameTaken(name: string, exceptId?: string): boolean {
    const key = normalizeProductName(name)
    return catalog.some((entry) => entry.id !== exceptId && normalizeProductName(entry.name) === key)
  }

  async function handleDelete(entry: ProductCatalogEntry) {
    const confirmed = await confirmDialog({
      title: `¿Eliminar «${entry.name}»?`,
      message: 'Dejará de sugerirse su imagen al agregar ítems con ese nombre.',
    })
    if (confirmed) onDelete(entry.id)
  }

  return (
    <div className="page page-with-fab">
      <header className="page-header">
        <h1 className="page-title">Productos</h1>
        <p className="page-subtitle">La imagen que se muestra sola cuando agregas un ítem con ese nombre.</p>
      </header>

      {!loading && missingDefaults > 0 && (
        <button type="button" className="btn" onClick={onAddDefaults}>
          Agregar {missingDefaults} productos del catálogo base
        </button>
      )}

      {catalog.length > 8 && (
        <label className="search">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Buscar producto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar producto"
          />
        </label>
      )}

      {loading ? (
        <SkeletonList count={4} />
      ) : catalog.length === 0 ? (
        <div className="empty">
          <div className="empty-art">🧺</div>
          <p className="empty-title">Sin productos</p>
          <p>Agrega productos para que tus ítems tengan imagen automáticamente.</p>
          <button type="button" className="btn btn-accent" onClick={() => setSheet('new')}>
            <Icon name="plus" size={18} />
            Nuevo producto
          </button>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Sin resultados</p>
          <p>Ningún producto coincide con «{query}».</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {filteredCatalog.map((entry) => (
            <li key={entry.id}>
              <button type="button" className={styles.tile} onClick={() => setSheet(entry.id)}>
                <span className={styles.tileImage}>
                  {entry.imageUrl ? (
                    <ProductPhoto src={entry.imageUrl} fallback={<ProductIcon iconKey={entry.iconKey} size={52} />} alt="" loading="lazy" decoding="async" className={styles.tilePhoto} />
                  ) : (
                    <ProductIcon iconKey={entry.iconKey} size={52} />
                  )}
                </span>
                <span className={styles.tileName}>{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {catalog.length > 0 && (
        <div className="fab-layer">
          <button type="button" className="fab fab-above-tabs" onClick={() => setSheet('new')}>
            <Icon name="plus" size={22} />
            Nuevo
          </button>
        </div>
      )}

      {sheet === 'new' && (
        <ProductSheet
          nameTaken={(name) => nameTaken(name)}
          onSave={onCreate}
          onClose={() => setSheet(null)}
        />
      )}
      {editing && (
        <ProductSheet
          key={editing.id}
          entry={editing}
          nameTaken={(name) => nameTaken(name, editing.id)}
          onSave={(name, iconKey) => onUpdate(editing.id, name, iconKey)}
          onDelete={() => void handleDelete(editing)}
          onUploadImage={(file) => onUploadImage(editing.id, file)}
          onRemoveImage={() => onRemoveImage(editing.id)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

interface ProductSheetProps {
  entry?: ProductCatalogEntry
  nameTaken: (name: string) => boolean
  onSave: (name: string, iconKey: string) => void
  onDelete?: () => void
  onUploadImage?: (file: File) => Promise<void>
  onRemoveImage?: () => void
  onClose: () => void
}

function ProductSheet({ entry, nameTaken, onSave, onDelete, onUploadImage, onRemoveImage, onClose }: ProductSheetProps) {
  const [name, setName] = useState(entry?.name ?? '')
  const [iconKey, setIconKey] = useState(entry?.iconKey ?? ALL_ICON_KEYS[0])
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trimmed = name.trim()
  const duplicate = trimmed !== '' && nameTaken(trimmed)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate) return
    onSave(trimmed, iconKey)
    onClose()
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !onUploadImage) return
    setUploading(true)
    setImageError(null)
    try {
      await onUploadImage(file)
    } catch (err) {
      setImageError(describeUploadError(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <BottomSheet title={entry ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <span className={`${styles.preview} ${uploading ? styles.previewUploading : ''}`}>
            {entry?.imageUrl ? (
              <ProductPhoto src={entry.imageUrl} fallback={<ProductIcon iconKey={iconKey} size={40} />} alt="" className={styles.tilePhoto} />
            ) : (
              <ProductIcon iconKey={iconKey} size={40} />
            )}
          </span>
          <input
            className="input"
            type="text"
            placeholder="Nombre (ej: kiwi)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            enterKeyHint="done"
            aria-label="Nombre del producto"
            aria-invalid={duplicate}
            autoFocus={!entry}
          />
        </div>
        {duplicate && (
          <p className={styles.error} role="alert">
            Ya tienes un producto con ese nombre.
          </p>
        )}

        {entry && onUploadImage && (
          <div className={styles.photoActions}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden />
            <button type="button" className="chip" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Icon name="camera" size={16} />
              {uploading ? 'Subiendo…' : entry.imageUrl ? 'Cambiar foto' : 'Subir foto propia'}
            </button>
            {entry.imageUrl && !uploading && (
              <button type="button" className="chip" onClick={onRemoveImage}>
                Quitar foto
              </button>
            )}
          </div>
        )}
        {imageError && (
          <p className={styles.error} role="alert">
            {imageError}
          </p>
        )}

        <div className="field">
          <span className="field-label">{entry?.imageUrl ? 'Ícono de respaldo' : 'Ícono'}</span>
          <ProductIconGrid value={iconKey} onChange={setIconKey} />
        </div>

        <div className="btn-row">
          {onDelete && (
            <button
              type="button"
              className="btn btn-danger-soft"
              onClick={() => {
                onClose()
                onDelete()
              }}
            >
              <Icon name="trash" size={18} />
              Eliminar
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!trimmed || duplicate}>
            {entry ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
