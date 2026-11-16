import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Category, Item } from '../types'
import type { NewItemInput } from '../hooks/useShoppingLists'
import { normalizeProductName, type CatalogIcon } from '../lib/productCatalog'
import { matchSuggestions, type ItemMemory } from '../lib/itemSuggestions'
import { describeUploadError } from '../lib/imageUpload'
import { readPurchaseDraft } from '../lib/pricing'
import { usePrefs } from '../lib/prefs'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { ItemThumb } from './ItemThumb'
import { CategoryChips, ProductIconGrid } from './Pickers'
import styles from './ItemSheet.module.css'
import { PurchaseFields } from './PurchaseFields'
import { usePurchaseDraft } from '../hooks/usePurchaseDraft'

interface AddItemSheetProps {
  items: Item[]
  categories: Category[]
  itemMemory: ItemMemory
  productCatalog: Map<string, CatalogIcon>
  onAdd: (input: NewItemInput) => void
  onToggleItem: (itemId: string) => void
  onClose: () => void
}

// Panel para agregar ítems. Queda abierto después de cada alta para poder
// cargar varios seguidos; la categoría se completa sola si el producto ya
// se compró antes.
export function AddItemSheet({
  items,
  categories,
  itemMemory,
  productCatalog,
  onAdd,
  onToggleItem,
  onClose,
}: AddItemSheetProps) {
  const [name, setName] = useState('')
  const [draft, setDraft] = usePurchaseDraft()
  const { currency } = usePrefs()
  const [manualCategoryId, setManualCategoryId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; warn?: boolean } | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const categoryIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories])

  function rememberedCategory(productName: string): string {
    const remembered = itemMemory.categoryByName.get(normalizeProductName(productName))
    return remembered && categoryIds.has(remembered) ? remembered : ''
  }

  const categoryId = manualCategoryId ?? rememberedCategory(name)

  const pendingNames = useMemo(
    () => new Set(items.filter((item) => !item.done).map((item) => normalizeProductName(item.name))),
    [items],
  )
  const suggestions = useMemo(
    () => matchSuggestions(itemMemory.names, productCatalog.keys(), name, pendingNames),
    [itemMemory.names, productCatalog, name, pendingNames],
  )

  function add(rawName: string, chosenCategoryId: string) {
    const trimmed = rawName.trim()
    if (!trimmed) return
    let purchase
    try { purchase = readPurchaseDraft(draft, currency) } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Revisa cantidad y precio.', warn: true })
      return
    }
    const key = normalizeProductName(trimmed)
    const existing = items.find((item) => normalizeProductName(item.name) === key)

    if (existing && !existing.done) {
      setNotice({ text: `«${existing.name}» ya está en la lista`, warn: true })
    } else if (existing) {
      // Ya estaba comprado: lo devolvemos a pendientes en vez de duplicarlo.
      onToggleItem(existing.id)
      setNotice({ text: `«${existing.name}» volvió a pendientes` })
    } else {
      onAdd({ name: trimmed, ...purchase, categoryId: chosenCategoryId || undefined })
      setNotice({ text: `«${trimmed}» agregado` })
    }

    setName('')
    setDraft({ quantity: '1', unit: 'unit', price: '', mode: 'unit' })
    setManualCategoryId(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    add(name, categoryId)
    nameInputRef.current?.focus()
  }

  return (
    <BottomSheet title="Agregar ítems" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <input
            ref={nameInputRef}
            className="input"
            type="text"
            placeholder="¿Qué necesitas?"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNotice(null)
            }}
            maxLength={120}
            enterKeyHint="send"
            autoCapitalize="sentences"
            aria-label="Nombre del ítem"
            autoFocus
          />
        </div>
        <PurchaseFields draft={draft} onChange={setDraft} />

        <div role="status">
          {notice && (
            <p className={`${styles.notice} ${notice.warn ? styles.noticeWarn : ''}`}>
              <Icon name={notice.warn ? 'alert' : 'check'} size={15} />
              {notice.text}
            </p>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className={styles.block}>
            <span className="field-label">{name.trim() ? 'Sugerencias' : 'Compras frecuentes'}</span>
            <div className="chip-scroll">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`chip ${styles.suggestion}`}
                  onClick={() => add(suggestion, manualCategoryId ?? rememberedCategory(suggestion))}
                >
                  <ItemThumb item={{ name: suggestion }} catalog={productCatalog} size={26} />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className={styles.block}>
            <span className="field-label">Categoría</span>
            <CategoryChips categories={categories} value={categoryId} onChange={setManualCategoryId} />
          </div>
        )}

        <div className="btn-row">
          <button type="button" className="btn" onClick={onClose}>
            Listo
          </button>
          <button type="submit" className="btn btn-accent" disabled={!name.trim()}>
            <Icon name="plus" size={18} />
            Agregar
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

interface EditItemSheetProps {
  item: Item
  categories: Category[]
  productCatalog: Map<string, CatalogIcon>
  onSave: (input: NewItemInput) => void
  onDelete: () => void
  onUploadImage: (file: File) => Promise<void>
  onRemoveImage: () => void
  onChooseIcon: (iconKey: string | undefined) => void
  onClose: () => void
}

export function EditItemSheet({
  item,
  categories,
  productCatalog,
  onSave,
  onDelete,
  onUploadImage,
  onRemoveImage,
  onChooseIcon,
  onClose,
}: EditItemSheetProps) {
  const { currency } = usePrefs()
  const [name, setName] = useState(item.name)
  const [draft, setDraft] = usePurchaseDraft(item)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState(item.categoryId ?? '')
  const [pickingIcon, setPickingIcon] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasCustomImage = Boolean(item.imageUrl || item.iconKey)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    let purchase
    try { purchase = readPurchaseDraft(draft, currency) } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Revisa cantidad y precio.')
      return
    }
    onSave({
      name: trimmed,
      ...purchase,
      categoryId: categoryId || undefined,
    })
    onClose()
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setImageError(null)
    try {
      await onUploadImage(file)
      setPickingIcon(false)
    } catch (err) {
      setImageError(describeUploadError(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <BottomSheet title="Editar ítem" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.imageRow}>
          <span className={`${styles.imagePreview} ${uploading ? styles.imageUploading : ''}`}>
            <ItemThumb item={{ ...item, name }} catalog={productCatalog} size={60} />
          </span>
          <div className={styles.imageActions}>
            <button
              type="button"
              className={`chip ${styles.imageChip}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Icon name="camera" size={16} />
              {uploading ? 'Subiendo…' : 'Foto'}
            </button>
            <button
              type="button"
              className={`chip ${styles.imageChip} ${pickingIcon ? 'chip-selected' : ''}`}
              onClick={() => setPickingIcon((prev) => !prev)}
              aria-expanded={pickingIcon}
            >
              Ícono
            </button>
            {hasCustomImage && !uploading && (
              <button
                type="button"
                className={`chip ${styles.imageChip}`}
                onClick={() => (item.imageUrl ? onRemoveImage() : onChooseIcon(undefined))}
              >
                Quitar
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden />
        </div>
        {imageError && (
          <p className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
            <Icon name="alert" size={15} />
            {imageError}
          </p>
        )}
        {pickingIcon && (
          <ProductIconGrid
            value={item.iconKey}
            onChange={(iconKey) => {
              onChooseIcon(iconKey)
              setPickingIcon(false)
            }}
          />
        )}

        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            enterKeyHint="done"
          />
        </label>

        <PurchaseFields draft={draft} onChange={(next) => { setDraft(next); setFormError(null) }} />
        {formError && <p className={`${styles.notice} ${styles.noticeWarn}`} role="alert">{formError}</p>}

        {categories.length > 0 && (
          <div className={styles.block}>
            <span className="field-label">Categoría</span>
            <CategoryChips categories={categories} value={categoryId} onChange={setCategoryId} />
          </div>
        )}

        <div className="btn-row">
          <button
            type="button"
            className={`btn btn-danger-soft ${styles.deleteButton}`}
            onClick={() => {
              onClose()
              onDelete()
            }}
          >
            <Icon name="trash" size={18} />
            Eliminar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Guardar
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
