import { memo, useCallback, useMemo, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import type { Category, Item, ShoppingList } from '../types'
import { UNCATEGORIZED_LABEL } from '../lib/categories'
import { Icon } from './Icon'
import styles from './ListDetail.module.css'

interface ListDetailProps {
  list: ShoppingList
  categories: Category[]
  onBack: () => void
  onAddItem: (name: string, quantity?: string, categoryId?: string) => void
  onUpdateItem: (itemId: string, name: string, quantity?: string, categoryId?: string, price?: number) => void
  onToggleItem: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onMoveItem: (itemId: string, neighborId: string) => void
  onUploadItemImage: (itemId: string, file: File) => Promise<void>
  onRemoveItemImage: (itemId: string) => void
  onClearCompleted: () => void
  onUpdateListName: (name: string) => void
  onDeleteList: () => void
}

interface ItemGroup {
  label: string
  items: Item[]
}

function groupByCategory(items: Item[], categoriesById: Map<string, Category>): ItemGroup[] {
  const sorted = [...items].sort((a, b) => a.position - b.position)
  const map = new Map<string, { label: string; items: Item[]; order: number }>()
  for (const item of sorted) {
    const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined
    const key = category?.id ?? UNCATEGORIZED_LABEL
    const label = category ? `${category.icon} ${category.name}` : UNCATEGORIZED_LABEL
    const order = category ? category.position : Number.MAX_SAFE_INTEGER
    const bucket = map.get(key)
    if (bucket) bucket.items.push(item)
    else map.set(key, { label, items: [item], order })
  }
  return Array.from(map.values())
    .sort((a, b) => a.order - b.order)
    .map(({ label, items: groupItems }) => ({ label, items: groupItems }))
}

function buildShareText(list: ShoppingList): string {
  const pending = list.items.filter((item) => !item.done)
  const source = pending.length > 0 ? pending : list.items
  if (source.length === 0) return `${list.name}\n\nSin ítems.`
  const lines = source.map((item) => `- ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`)
  return `${list.name}\n\n${lines.join('\n')}`
}

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

export function ListDetail({
  list,
  categories,
  onBack,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  onMoveItem,
  onUploadItemImage,
  onRemoveItemImage,
  onClearCompleted,
  onUpdateListName,
  onDeleteList,
}: ListDetailProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(list.name)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAddItem(trimmed, quantity, categoryId || undefined)
    setName('')
    setQuantity('')
  }

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return list.items
    return list.items.filter((item) => item.name.toLowerCase().includes(trimmed))
  }, [list.items, query])

  const pending = useMemo(() => filteredItems.filter((item) => !item.done), [filteredItems])
  const done = useMemo(() => filteredItems.filter((item) => item.done), [filteredItems])
  const pendingGroups = useMemo(() => groupByCategory(pending, categoriesById), [pending, categoriesById])

  const pendingTotal = useMemo(
    () => pending.reduce((sum, item) => sum + (item.price ?? 0), 0),
    [pending],
  )

  const handleToggle = useCallback((itemId: string) => onToggleItem(itemId), [onToggleItem])
  const handleDelete = useCallback((itemId: string) => onDeleteItem(itemId), [onDeleteItem])
  const handleSave = useCallback(
    (itemId: string, itemName: string, itemQuantity?: string, itemCategoryId?: string, itemPrice?: number) =>
      onUpdateItem(itemId, itemName, itemQuantity, itemCategoryId, itemPrice),
    [onUpdateItem],
  )

  function startEditingTitle() {
    setTitleDraft(list.name)
    setEditingTitle(true)
  }

  function saveTitle() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== list.name) onUpdateListName(trimmed)
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  async function handleShare() {
    const text = buildShareText(list)
    if (navigator.share) {
      try {
        await navigator.share({ title: list.name, text })
      } catch {
        // el usuario canceló el share, no hacer nada
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setShareStatus('Copiado al portapapeles')
    } catch {
      setShareStatus('No se pudo copiar')
    }
    setTimeout(() => setShareStatus(null), 2500)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack} aria-label="Volver a mis listas">
          <Icon name="back" />
        </button>
        <div className={styles.headerText}>
          {editingTitle ? (
            <input
              className={styles.titleInput}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <h1 className={styles.title} onClick={startEditingTitle}>
              {list.name}
            </h1>
          )}
          <p className={styles.subtitle}>
            {list.items.length === 0
              ? 'Sin ítems todavía'
              : `${done.length} de ${list.items.length} comprados`}
            {pendingTotal > 0 && ` · ${formatPrice(pendingTotal)} pendiente`}
          </p>
        </div>
        <button className={styles.iconButton} aria-label="Compartir lista" onClick={handleShare}>
          <Icon name="share" />
        </button>
        <button
          className={styles.deleteListButton}
          aria-label="Eliminar lista"
          onClick={() => {
            if (confirm(`¿Eliminar la lista "${list.name}"?`)) {
              onDeleteList()
            }
          }}
        >
          <Icon name="close" />
        </button>
      </header>

      {shareStatus && <p className={styles.shareStatus}>{shareStatus}</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
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
            <Icon name="plus" size={22} />
          </button>
        </div>
        <select
          className={styles.categorySelect}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Categoría del ítem"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </form>

      {list.items.length > 3 && (
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar ítem…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar ítem"
        />
      )}

      {list.items.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="cart" size={40} className={styles.emptyIcon} />
          <p>Agrega tu primer ítem arriba.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.empty}>
          <p>Ningún ítem coincide con "{query}".</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {pendingGroups.map((group) => (
            <div key={group.label} className={styles.categoryGroup}>
              {pendingGroups.length > 1 && <p className={styles.categoryLabel}>{group.label}</p>}
              <ul className={styles.itemList}>
                {group.items.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onSave={handleSave}
                    onUploadImage={onUploadItemImage}
                    onRemoveImage={onRemoveItemImage}
                    onMoveUp={index > 0 ? () => onMoveItem(item.id, group.items[index - 1].id) : undefined}
                    onMoveDown={
                      index < group.items.length - 1
                        ? () => onMoveItem(item.id, group.items[index + 1].id)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
          {done.length > 0 && (
            <div className={styles.doneSection}>
              <div className={styles.doneHeader}>
                <p className={styles.doneLabel}>Comprados</p>
                <button
                  className={styles.clearCompletedButton}
                  onClick={() => {
                    if (confirm('¿Vaciar los ítems comprados?')) onClearCompleted()
                  }}
                >
                  Vaciar
                </button>
              </div>
              <ul className={styles.itemList}>
                {done.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onSave={handleSave}
                    onUploadImage={onUploadItemImage}
                    onRemoveImage={onRemoveItemImage}
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
  categories: Category[]
  onToggle: (itemId: string) => void
  onDelete: (itemId: string) => void
  onSave: (itemId: string, name: string, quantity?: string, categoryId?: string, price?: number) => void
  onUploadImage: (itemId: string, file: File) => Promise<void>
  onRemoveImage: (itemId: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const ItemRow = memo(function ItemRow({
  item,
  categories,
  onToggle,
  onDelete,
  onSave,
  onUploadImage,
  onRemoveImage,
  onMoveUp,
  onMoveDown,
}: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(item.name)
  const [quantityDraft, setQuantityDraft] = useState(item.quantity ?? '')
  const [categoryIdDraft, setCategoryIdDraft] = useState(item.categoryId ?? '')
  const [priceDraft, setPriceDraft] = useState(item.price != null ? String(item.price) : '')
  const [uploadingImage, setUploadingImage] = useState(false)

  const category = item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined

  function startEditing() {
    setNameDraft(item.name)
    setQuantityDraft(item.quantity ?? '')
    setCategoryIdDraft(item.categoryId ?? '')
    setPriceDraft(item.price != null ? String(item.price) : '')
    setEditing(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    const parsedPrice = priceDraft.trim() ? Number(priceDraft) : undefined
    onSave(
      item.id,
      trimmed,
      quantityDraft,
      categoryIdDraft || undefined,
      Number.isFinite(parsedPrice) ? parsedPrice : undefined,
    )
    setEditing(false)
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingImage(true)
    try {
      await onUploadImage(item.id, file)
    } finally {
      setUploadingImage(false)
    }
  }

  if (editing) {
    return (
      <li className={styles.item}>
        <form className={styles.editForm} onSubmit={handleSubmit}>
          <div className={styles.editImageRow}>
            <span className={styles.editImagePreview}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className={styles.editImagePreviewImg} />
              ) : (
                <Icon name="cart" size={20} />
              )}
            </span>
            <label className={styles.editImageButton}>
              {uploadingImage ? 'Subiendo…' : item.imageUrl ? 'Cambiar foto' : 'Agregar foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingImage}
                hidden
              />
            </label>
            {item.imageUrl && !uploadingImage && (
              <button type="button" className={styles.editImageRemove} onClick={() => onRemoveImage(item.id)}>
                Quitar
              </button>
            )}
          </div>
          <div className={styles.editRow}>
            <input
              className={styles.editInputName}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
            />
            <input
              className={styles.editInputQty}
              value={quantityDraft}
              onChange={(e) => setQuantityDraft(e.target.value)}
              placeholder="Cant."
            />
          </div>
          <div className={styles.editRow}>
            <select
              className={styles.editSelectCategory}
              value={categoryIdDraft}
              onChange={(e) => setCategoryIdDraft(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <input
              className={styles.editInputPrice}
              type="number"
              step="0.01"
              min="0"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              placeholder="Precio"
            />
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
    <li className={`${styles.item} ${item.done ? styles.itemDone : ''}`}>
      <button
        className={styles.checkbox}
        onClick={() => onToggle(item.id)}
        aria-label={item.done ? 'Marcar como pendiente' : 'Marcar como comprado'}
      >
        {item.done && <Icon name="check" size={16} className={styles.checkmark} />}
      </button>
      <button className={styles.itemMain} onClick={() => onToggle(item.id)}>
        {(item.imageUrl || category) && (
          <span className={styles.itemThumb}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className={styles.itemThumbImg} />
            ) : (
              category?.icon
            )}
          </span>
        )}
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.itemMeta}>
          {item.quantity && <span className={styles.itemQty}>{item.quantity}</span>}
          {item.price != null && <span className={styles.itemPrice}>{formatPrice(item.price)}</span>}
        </span>
      </button>
      {(onMoveUp || onMoveDown) && (
        <div className={styles.moveButtons}>
          <button
            className={styles.moveButton}
            onClick={onMoveUp}
            disabled={!onMoveUp}
            aria-label={`Subir ${item.name}`}
          >
            <Icon name="chevronUp" size={14} />
          </button>
          <button
            className={styles.moveButton}
            onClick={onMoveDown}
            disabled={!onMoveDown}
            aria-label={`Bajar ${item.name}`}
          >
            <Icon name="chevronDown" size={14} />
          </button>
        </div>
      )}
      <button className={styles.itemEdit} onClick={startEditing} aria-label={`Editar ${item.name}`}>
        <Icon name="edit" size={17} />
      </button>
      <button className={styles.itemDelete} onClick={() => onDelete(item.id)} aria-label={`Eliminar ${item.name}`}>
        <Icon name="close" size={17} />
      </button>
    </li>
  )
})
