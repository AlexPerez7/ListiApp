import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category, Item, ShoppingList } from '../types'
import { UNCATEGORIZED_LABEL } from '../lib/categories'
import { getCatalogIcon, type CatalogIcon } from '../lib/productCatalog'
import { ALL_ICON_KEYS } from '../lib/productIcons'
import { matchSuggestions } from '../lib/itemSuggestions'
import { ProductIcon } from './ProductIcon'
import { describeUploadError } from '../lib/imageUpload'
import { useSwipeToDelete } from '../hooks/useSwipeToDelete'
import { hasSeenSwipeHint, markSwipeHintSeen } from '../lib/swipeHint'
import { Icon } from './Icon'
import styles from './ListDetail.module.css'

interface ListDetailProps {
  list: ShoppingList
  categories: Category[]
  itemNameHistory: string[]
  productCatalog: Map<string, CatalogIcon>
  onBack: () => void
  onAddItem: (name: string, quantity?: string, categoryId?: string) => void
  onUpdateItem: (itemId: string, name: string, quantity?: string, categoryId?: string, price?: number) => void
  onToggleItem: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onReorderItems: (orderedItemIds: string[]) => void
  onUploadItemImage: (itemId: string, file: File) => Promise<void>
  onRemoveItemImage: (itemId: string) => void
  onChooseItemIcon: (itemId: string, iconKey: string | undefined) => void
  onClearCompleted: () => void
  onUpdateListName: (name: string) => void
  onDeleteList: () => void
  onConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
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
  itemNameHistory,
  productCatalog,
  onBack,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  onReorderItems,
  onUploadItemImage,
  onRemoveItemImage,
  onChooseItemIcon,
  onClearCompleted,
  onUpdateListName,
  onDeleteList,
  onConfirm,
}: ListDetailProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(list.name)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  function openAddSheet() {
    setName('')
    setQuantity('')
    setCategoryId('')
    setAddSheetOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAddItem(trimmed, quantity, categoryId || undefined)
    setName('')
    setQuantity('')
    setAddSheetOpen(false)
  }

  const pendingNameSet = useMemo(
    () => new Set(list.items.filter((item) => !item.done).map((item) => item.name.trim().toLowerCase())),
    [list.items],
  )
  const suggestions = useMemo(
    () => matchSuggestions(itemNameHistory, name, pendingNameSet),
    [itemNameHistory, name, pendingNameSet],
  )

  function addSuggestion(suggestionName: string) {
    onAddItem(suggestionName, undefined, categoryId || undefined)
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

  const [showSwipeHint] = useState(() => !hasSeenSwipeHint())
  const firstPendingItemId = pendingGroups[0]?.items[0]?.id

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      for (const group of pendingGroups) {
        const ids = group.items.map((item) => item.id)
        const activeIndex = ids.indexOf(String(active.id))
        const overIndex = ids.indexOf(String(over.id))
        if (activeIndex === -1 || overIndex === -1) continue
        onReorderItems(arrayMove(ids, activeIndex, overIndex))
        return
      }
    },
    [pendingGroups, onReorderItems],
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
          onClick={async () => {
            if (await onConfirm(`¿Eliminar la lista "${list.name}"?`)) {
              onDeleteList()
            }
          }}
        >
          <Icon name="close" />
        </button>
      </header>

      {shareStatus && <p className={styles.shareStatus}>{shareStatus}</p>}

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
          <p>Agrega tu primer ítem con el botón +.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.empty}>
          <p>Ningún ítem coincide con "{query}".</p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className={styles.groups}>
            {pendingGroups.length === 0 && done.length > 0 && !query.trim() && (
              <div className={styles.celebration}>
                <span className={styles.celebrationEmoji}>🎉</span>
                <p>¡Todo comprado!</p>
              </div>
            )}
            {pendingGroups.map((group) => (
              <div key={group.label} className={styles.categoryGroup}>
                {pendingGroups.length > 1 && <p className={styles.categoryLabel}>{group.label}</p>}
                <SortableContext
                  items={group.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className={styles.itemList}>
                    {group.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        categories={categories}
                        productCatalog={productCatalog}
                        draggable
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onSave={handleSave}
                        onUploadImage={onUploadItemImage}
                        onRemoveImage={onRemoveItemImage}
                        onChooseIcon={onChooseItemIcon}
                        showSwipeHint={showSwipeHint && item.id === firstPendingItemId}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </div>
            ))}
            {done.length > 0 && (
              <div className={styles.doneSection}>
                <div className={styles.doneHeader}>
                  <p className={styles.doneLabel}>Comprados</p>
                  <button
                    className={styles.clearCompletedButton}
                    onClick={async () => {
                      if (await onConfirm('¿Vaciar los ítems comprados?', 'Vaciar')) onClearCompleted()
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
                      productCatalog={productCatalog}
                      draggable={false}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onSave={handleSave}
                      onUploadImage={onUploadItemImage}
                      onRemoveImage={onRemoveItemImage}
                      onChooseIcon={onChooseItemIcon}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DndContext>
      )}

      <div className={styles.fabLayer}>
        <button className={styles.fab} onClick={openAddSheet} aria-label="Agregar ítem">
          <Icon name="plus" size={26} />
        </button>
      </div>

      {addSheetOpen && (
        <div className={styles.sheetOverlay} onClick={() => setAddSheetOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>Nuevo ítem</h2>
            <form className={styles.sheetForm} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <input
                  className={styles.inputName}
                  type="text"
                  placeholder="Ítem (ej: Leche)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <input
                  className={styles.inputQty}
                  type="text"
                  placeholder="Cant."
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              {suggestions.length > 0 && (
                <div className={styles.suggestionRow}>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={styles.suggestionChip}
                      onClick={() => addSuggestion(suggestion)}
                    >
                      <Icon name="plus" size={12} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
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
              <div className={styles.sheetActions}>
                <button
                  className={styles.sheetCancelButton}
                  type="button"
                  onClick={() => setAddSheetOpen(false)}
                >
                  Cancelar
                </button>
                <button className={styles.sheetAddButton} type="submit" disabled={!name.trim()}>
                  <Icon name="plus" size={16} />
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

interface ItemRowProps {
  item: Item
  categories: Category[]
  productCatalog: Map<string, CatalogIcon>
  draggable: boolean
  onToggle: (itemId: string) => void
  onDelete: (itemId: string) => void
  onSave: (itemId: string, name: string, quantity?: string, categoryId?: string, price?: number) => void
  onUploadImage: (itemId: string, file: File) => Promise<void>
  onRemoveImage: (itemId: string) => void
  onChooseIcon: (itemId: string, iconKey: string | undefined) => void
  showSwipeHint?: boolean
}

const ItemRow = memo(function ItemRow({
  item,
  categories,
  productCatalog,
  draggable,
  onToggle,
  onDelete,
  onSave,
  onUploadImage,
  onRemoveImage,
  onChooseIcon,
  showSwipeHint,
}: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(item.name)
  const [quantityDraft, setQuantityDraft] = useState(item.quantity ?? '')
  const [categoryIdDraft, setCategoryIdDraft] = useState(item.categoryId ?? '')
  const [priceDraft, setPriceDraft] = useState(item.price != null ? String(item.price) : '')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const catalogIcon = useMemo(() => getCatalogIcon(productCatalog, item.name), [productCatalog, item.name])
  const displayImageUrl = item.iconKey ? undefined : catalogIcon?.imageUrl
  const displayIconKey = item.iconKey ?? catalogIcon?.iconKey

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
  })
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  }

  const {
    offset: swipeOffset,
    peeking,
    handlers: swipeHandlers,
    peek,
  } = useSwipeToDelete(() => onDelete(item.id))

  useEffect(() => {
    if (!showSwipeHint) return
    const timer = window.setTimeout(() => {
      peek()
      markSwipeHintSeen()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [showSwipeHint, peek])

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
      Number.isFinite(parsedPrice) && parsedPrice! >= 0 ? parsedPrice : undefined,
    )
    setEditing(false)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  function openFilePicker() {
    setPhotoSheetOpen(false)
    fileInputRef.current?.click()
  }

  function chooseIcon(iconKey: string) {
    onChooseIcon(item.id, iconKey)
    setPhotoSheetOpen(false)
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingImage(true)
    setImageError(null)
    try {
      await onUploadImage(item.id, file)
    } catch (err) {
      setImageError(describeUploadError(err))
    } finally {
      setUploadingImage(false)
    }
  }

  const thumbButton = (
    <button
      type="button"
      className={`${styles.itemThumb} ${uploadingImage ? styles.itemThumbUploading : ''}`}
      onClick={() => setPhotoSheetOpen(true)}
      disabled={uploadingImage}
      aria-label={`Cambiar imagen de ${item.name}`}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className={styles.itemThumbImg} />
      ) : displayImageUrl ? (
        <img src={displayImageUrl} alt="" className={styles.itemThumbImg} />
      ) : displayIconKey ? (
        <ProductIcon iconKey={displayIconKey} size={20} />
      ) : (
        <Icon name="cart" size={18} />
      )}
    </button>
  )

  const photoInputAndSheet = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        disabled={uploadingImage}
        hidden
      />
      {photoSheetOpen && (
        <div className={styles.sheetOverlay} onClick={() => setPhotoSheetOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>Imagen de {item.name}</h2>
            <button type="button" className={styles.sheetUploadButton} onClick={openFilePicker}>
              <Icon name="upload" size={16} />
              Subir una foto
            </button>
            {item.imageUrl && (
              <button
                type="button"
                className={styles.sheetRemovePhotoButton}
                onClick={() => {
                  onRemoveImage(item.id)
                  setPhotoSheetOpen(false)
                }}
              >
                Quitar foto
              </button>
            )}
            <p className={styles.sheetIconLabel}>O elige un ícono</p>
            <div className={styles.iconGrid}>
              {ALL_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.iconGridOption} ${key === item.iconKey ? styles.iconGridOptionSelected : ''}`}
                  onClick={() => chooseIcon(key)}
                  aria-label={key}
                >
                  <ProductIcon iconKey={key} size={22} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (editing) {
    return (
      <li ref={setNodeRef} style={dragStyle} className={styles.item}>
        <form className={styles.editForm} onSubmit={handleSubmit}>
          <div className={styles.editImageRow}>
            {thumbButton}
            <span className={styles.editImageHint}>Toca la imagen para cambiarla</span>
            {item.imageUrl && !uploadingImage && (
              <button type="button" className={styles.editImageRemove} onClick={() => onRemoveImage(item.id)}>
                Quitar
              </button>
            )}
          </div>
          {imageError && <p className={styles.editImageError}>{imageError}</p>}
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
            <button
              className={styles.editDeleteButton}
              type="button"
              onClick={() => {
                setEditing(false)
                onDelete(item.id)
              }}
            >
              Eliminar
            </button>
            <div className={styles.editActionsRight}>
              <button className={styles.editCancelButton} type="button" onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button className={styles.editSaveButton} type="submit" disabled={!nameDraft.trim()}>
                Guardar
              </button>
            </div>
          </div>
        </form>
        {photoInputAndSheet}
      </li>
    )
  }

  return (
    <li ref={setNodeRef} style={dragStyle} className={styles.itemWrapper}>
      <div className={styles.swipeBg} aria-hidden="true" style={{ opacity: swipeOffset === 0 ? 0 : 1 }}>
        <Icon name="close" size={18} />
      </div>
      <div
        className={`${styles.item} ${item.done ? styles.itemDone : ''}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: peeking ? 'transform 0.35s ease' : undefined,
        }}
        {...swipeHandlers}
      >
        {draggable && (
          <button
            className={styles.dragHandle}
            aria-label={`Reordenar ${item.name}`}
            {...attributes}
            {...listeners}
            onPointerDown={(e) => {
              e.stopPropagation()
              listeners?.onPointerDown?.(e)
            }}
          >
            <Icon name="grip" size={16} />
          </button>
        )}
        {thumbButton}
        <div className={styles.itemMain}>
          <span className={styles.itemName}>{item.name}</span>
          <span className={styles.itemMeta}>
            {item.quantity && <span className={styles.itemQty}>{item.quantity}</span>}
            {item.price != null && <span className={styles.itemPrice}>{formatPrice(item.price)}</span>}
          </span>
        </div>
        <button className={styles.itemEdit} onClick={startEditing} aria-label={`Editar ${item.name}`}>
          <Icon name="edit" size={17} />
        </button>
        <button
          className={styles.checkbox}
          onClick={() => onToggle(item.id)}
          aria-label={item.done ? 'Marcar como pendiente' : 'Marcar como comprado'}
        >
          {item.done && <Icon name="check" size={16} className={styles.checkmark} />}
        </button>
      </div>
      {imageError && <p className={styles.itemImageError}>{imageError}</p>}
      {photoInputAndSheet}
    </li>
  )
})
