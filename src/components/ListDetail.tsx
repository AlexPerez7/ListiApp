import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category, Item, ShoppingList } from '../types'
import type { NewItemInput } from '../hooks/useShoppingLists'
import { UNCATEGORIZED_LABEL } from '../lib/categories'
import type { CatalogIcon } from '../lib/productCatalog'
import type { ItemMemory } from '../lib/itemSuggestions'
import { formatPrice, pluralize } from '../lib/format'
import { usePrefs } from '../lib/prefs'
import { showToast } from '../lib/toast'
import { confirmDialog } from '../lib/confirm'
import { useSwipeToDelete } from '../hooks/useSwipeToDelete'
import { hasSeenSwipeHint, markSwipeHintSeen } from '../lib/swipeHint'
import { ActionSheet } from './BottomSheet'
import { RenameSheet } from './Home'
import { Icon } from './Icon'
import { ItemThumb } from './ItemThumb'
import { AddItemSheet, EditItemSheet } from './ItemSheet'
import { BudgetSheet } from './BudgetSheet'
import { itemTotal, QUANTITY_UNITS, sumItemTotals } from '../lib/pricing'
import { budgetSummary } from '../lib/budget'
import styles from './ListDetail.module.css'

interface ListDetailProps {
  list: ShoppingList
  categories: Category[]
  itemMemory: ItemMemory
  productCatalog: Map<string, CatalogIcon>
  onBack: () => void
  onAddItem: (input: NewItemInput) => void
  onUpdateItem: (itemId: string, input: NewItemInput) => void
  onToggleItem: (itemId: string) => void
  onDeleteItem: (item: Item) => void
  onReorderItems: (orderedItemIds: string[]) => void
  onUploadItemImage: (itemId: string, file: File) => Promise<void>
  onRemoveItemImage: (itemId: string) => void
  onChooseItemIcon: (itemId: string, iconKey: string | undefined) => void
  onClearCompleted: () => void
  onUncheckAll: () => void
  onRename: (name: string) => void
  onSetBudget: (budget: number | undefined, currency: string) => void
  onDuplicate: () => void
  onToggleTemplate: () => void
  onUseTemplate: () => void
  onDeleteList: () => void
}

interface ItemGroup {
  key: string
  label: string
  icon?: string
  items: Item[]
}

const SEARCH_MIN_ITEMS = 9

function groupByCategory(items: Item[], categoriesById: Map<string, Category>): ItemGroup[] {
  const sorted = [...items].sort((a, b) => a.position - b.position)
  const groups = new Map<string, ItemGroup & { order: number }>()
  for (const item of sorted) {
    const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined
    const key = category?.id ?? 'none'
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
    } else {
      groups.set(key, {
        key,
        label: category?.name ?? UNCATEGORIZED_LABEL,
        icon: category?.icon,
        items: [item],
        order: category ? category.position : Number.MAX_SAFE_INTEGER,
      })
    }
  }
  return [...groups.values()].sort((a, b) => a.order - b.order)
}

function buildShareText(list: ShoppingList): string {
  const pending = list.items.filter((item) => !item.done)
  const source = pending.length > 0 ? pending : list.items
  if (source.length === 0) return `${list.name}\n\nSin ítems.`
  const lines = source.map((item) => `☐ ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`)
  return `🛒 ${list.name}\n\n${lines.join('\n')}`
}

function sumPrices(items: Item[]): number {
  return sumItemTotals(items)
}

const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export function ListDetail({
  list,
  categories,
  itemMemory,
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
  onUncheckAll,
  onRename,
  onSetBudget,
  onDuplicate,
  onToggleTemplate,
  onUseTemplate,
  onDeleteList,
}: ListDetailProps) {
  const { currency } = usePrefs()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [doneCollapsed, setDoneCollapsed] = useState(false)
  const [showSwipeHint] = useState(() => !hasSeenSwipeHint())

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return list.items
    return list.items.filter((item) => item.name.toLowerCase().includes(needle))
  }, [list.items, query])

  const pending = useMemo(() => filteredItems.filter((item) => !item.done), [filteredItems])
  const done = useMemo(() => filteredItems.filter((item) => item.done), [filteredItems])
  const pendingGroups = useMemo(() => groupByCategory(pending, categoriesById), [pending, categoriesById])

  const totalCount = list.items.length
  const doneCount = useMemo(() => list.items.filter((item) => item.done).length, [list.items])
  const pendingTotal = useMemo(() => sumPrices(list.items.filter((item) => !item.done)), [list.items])
  const doneTotal = useMemo(() => sumPrices(list.items.filter((item) => item.done)), [list.items])
  const allDone = totalCount > 0 && doneCount === totalCount
  const budget = useMemo(() => budgetSummary(list, currency), [list, currency])
  const editingItem = editingItemId ? list.items.find((item) => item.id === editingItemId) : undefined
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

  async function handleShare() {
    const text = buildShareText(list)
    if (navigator.share) {
      try {
        await navigator.share({ title: list.name, text })
      } catch {
        // la persona canceló el diálogo de compartir
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast({ kind: 'success', message: 'Lista copiada al portapapeles' })
    } catch {
      showToast({ kind: 'error', message: 'No se pudo copiar la lista' })
    }
  }

  async function handleClearCompleted() {
    const confirmed = await confirmDialog({
      title: '¿Vaciar los comprados?',
      message: `Se ${doneCount === 1 ? 'eliminará' : 'eliminarán'} ${pluralize(doneCount, 'ítem', 'ítems')} de la lista.`,
      confirmLabel: 'Vaciar',
    })
    if (confirmed) onClearCompleted()
  }

  const menuActions = [
    { label: 'Renombrar', icon: 'edit' as const, onSelect: () => setRenaming(true) },
    { label: list.budget === undefined ? 'Definir presupuesto' : 'Editar presupuesto', icon: 'coins' as const, onSelect: () => setEditingBudget(true) },
    { label: 'Compartir', icon: 'share' as const, onSelect: () => void handleShare() },
    ...(doneCount > 0
      ? [
          { label: 'Desmarcar todo', icon: 'undo' as const, onSelect: onUncheckAll },
          { label: 'Vaciar comprados', icon: 'check' as const, onSelect: () => void handleClearCompleted() },
        ]
      : []),
    { label: 'Duplicar lista', icon: 'duplicate' as const, onSelect: onDuplicate },
    {
      label: list.isTemplate ? 'Quitar de plantillas' : 'Guardar como plantilla',
      icon: 'bookmark' as const,
      onSelect: onToggleTemplate,
    },
    { label: 'Eliminar lista', icon: 'trash' as const, danger: true, onSelect: onDeleteList },
  ]

  return (
    <div className={`page page-with-fab ${styles.page}`}>
      <header className={styles.header}>
        <button type="button" className="icon-btn icon-btn-surface" onClick={onBack} aria-label="Volver a mis listas">
          <Icon name="back" />
        </button>
        <button type="button" className={styles.titleButton} onClick={() => setRenaming(true)}>
          <h1 className={styles.title}>{list.name}</h1>
        </button>
        <button type="button" className="icon-btn" aria-label="Compartir lista" onClick={() => void handleShare()}>
          <Icon name="share" />
        </button>
        <button type="button" className="icon-btn" aria-label="Más opciones" onClick={() => setMenuOpen(true)}>
          <Icon name="more" />
        </button>
      </header>

      {list.isTemplate && (
        <div className={styles.templateBanner}>
          <Icon name="bookmark" size={18} filled />
          <p>Esta es una plantilla. Úsala para crear una lista nueva con estos ítems.</p>
          <button type="button" className={styles.templateButton} onClick={onUseTemplate}>
            Usar
          </button>
        </div>
      )}

      {totalCount > 0 && !list.isTemplate && (
        <section className={styles.summary} aria-label="Avance de la compra">
          <div className={styles.summaryTop}>
            <p className={styles.summaryCount}>
              <strong>{doneCount}</strong> de {totalCount} {totalCount === 1 ? 'comprado' : 'comprados'}
            </p>
            <p className={styles.summaryPercent}>{Math.round((doneCount / totalCount) * 100)}%</p>
          </div>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-valuenow={doneCount}
          >
            <span className={styles.progressFill} style={{ width: `${(doneCount / totalCount) * 100}%` }} />
          </div>
          {(pendingTotal > 0 || doneTotal > 0) && (
            <dl className={styles.totals}>
              <div>
                <dt>En el carro</dt>
                <dd>{formatPrice(doneTotal, currency)}</dd>
              </div>
              <div>
                <dt>Por comprar</dt>
                <dd>{formatPrice(pendingTotal, currency)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatPrice(doneTotal + pendingTotal, currency)}</dd>
              </div>
            </dl>
          )}
        </section>
      )}

      {!list.isTemplate && (
        <section className={`${styles.summary} ${budget.projectedRemaining !== undefined && budget.projectedRemaining < 0 ? styles.budgetExceeded : ''}`} aria-label="Presupuesto">
          <div className={styles.summaryTop}>
            <strong>{list.budget === undefined ? 'Presupuesto' : formatPrice(list.budget, list.budgetCurrency ?? currency)}</strong>
            <button type="button" className="chip" onClick={() => setEditingBudget(true)}>{list.budget === undefined ? 'Definir' : 'Editar'}</button>
          </div>
          {list.budget !== undefined && !budget.matchesCurrency ? (
            <p>El presupuesto está en {list.budgetCurrency}. Usa esa moneda en Ajustes o edita el presupuesto para compararlo.</p>
          ) : budget.remaining !== undefined ? (
            <>
              <p role="status">{budget.remaining >= 0 ? 'Disponible después del carro' : 'Exceso en el carro'}: {formatPrice(Math.abs(budget.remaining), currency)}</p>
              {budget.projectedRemaining !== undefined && budget.projectedRemaining < 0 ? (
                <p role="status">El total estimado supera el presupuesto por {formatPrice(-budget.projectedRemaining, currency)}.</p>
              ) : <p>Disponible después de toda la lista: {formatPrice(budget.projectedRemaining ?? 0, currency)}</p>}
              {budget.unpriced > 0 && <small>{pluralize(budget.unpriced, 'ítem sin precio', 'ítems sin precio')}. El cálculo está incompleto.</small>}
            </>
          ) : <p>Define un límite para comparar el carro y el total estimado.</p>}
        </section>
      )}
      {editingBudget && <BudgetSheet list={list} onSave={onSetBudget} onClose={() => setEditingBudget(false)} />}

      {totalCount >= SEARCH_MIN_ITEMS && (
        <label className="search">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Buscar en la lista"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar en la lista"
          />
        </label>
      )}

      {totalCount === 0 ? (
        <div className="empty">
          <div className="empty-art">📝</div>
          <p className="empty-title">Lista vacía</p>
          <p>Agrega lo que necesitas comprar.</p>
          <button type="button" className="btn btn-accent" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Agregar ítems
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Sin resultados</p>
          <p>Ningún ítem coincide con «{query}».</p>
        </div>
      ) : (
        <DndContext sensors={sensors} modifiers={[lockToVerticalAxis]} onDragEnd={handleDragEnd}>
          <div className={styles.groups}>
            {allDone && !query.trim() && (
              <div className={styles.celebration}>
                <span className={styles.celebrationEmoji}>🎉</span>
                <p className={styles.celebrationTitle}>¡Compra completa!</p>
                <p>Marcaste todos los ítems de la lista.</p>
              </div>
            )}

            {pendingGroups.map((group) => (
              <section key={group.key} className={styles.group}>
                {(pendingGroups.length > 1 || group.key !== 'none') && (
                  <h2 className={styles.groupLabel}>
                    {group.icon && <span aria-hidden="true">{group.icon}</span>}
                    {group.label}
                    <span className={styles.groupCount}>{group.items.length}</span>
                  </h2>
                )}
                <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <ul className={styles.itemList}>
                    {group.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        currency={currency}
                        productCatalog={productCatalog}
                        draggable={!query.trim() && group.items.length > 1}
                        onToggle={onToggleItem}
                        onEdit={setEditingItemId}
                        onDelete={onDeleteItem}
                        showSwipeHint={showSwipeHint && item.id === firstPendingItemId}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </section>
            ))}

            {done.length > 0 && (
              <section className={styles.group}>
                <div className={styles.doneHeader}>
                  <button
                    type="button"
                    className={styles.doneToggle}
                    onClick={() => setDoneCollapsed((prev) => !prev)}
                    aria-expanded={!doneCollapsed}
                  >
                    <Icon name={doneCollapsed ? 'chevronRight' : 'chevronDown'} size={16} />
                    Comprados
                    <span className={styles.groupCount}>{done.length}</span>
                  </button>
                  <button type="button" className={styles.clearButton} onClick={() => void handleClearCompleted()}>
                    Vaciar
                  </button>
                </div>
                {!doneCollapsed && (
                  <ul className={styles.itemList}>
                    {done.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        currency={currency}
                        productCatalog={productCatalog}
                        draggable={false}
                        onToggle={onToggleItem}
                        onEdit={setEditingItemId}
                        onDelete={onDeleteItem}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </DndContext>
      )}

      {totalCount > 0 && (
        <div className="fab-layer">
          <button type="button" className="fab" onClick={() => setAdding(true)}>
            <Icon name="plus" size={22} />
            Agregar
          </button>
        </div>
      )}

      {adding && (
        <AddItemSheet
          items={list.items}
          categories={categories}
          itemMemory={itemMemory}
          productCatalog={productCatalog}
          onAdd={onAddItem}
          onToggleItem={onToggleItem}
          onClose={() => setAdding(false)}
        />
      )}

      {editingItem && (
        <EditItemSheet
          key={editingItem.id}
          item={editingItem}
          categories={categories}
          productCatalog={productCatalog}
          onSave={(input) => onUpdateItem(editingItem.id, input)}
          onDelete={() => onDeleteItem(editingItem)}
          onUploadImage={(file) => onUploadItemImage(editingItem.id, file)}
          onRemoveImage={() => onRemoveItemImage(editingItem.id)}
          onChooseIcon={(iconKey) => onChooseItemIcon(editingItem.id, iconKey)}
          onClose={() => setEditingItemId(null)}
        />
      )}

      {menuOpen && <ActionSheet title={list.name} actions={menuActions} onClose={() => setMenuOpen(false)} />}

      {renaming && (
        <RenameSheet
          title="Renombrar lista"
          initialName={list.name}
          onSave={onRename}
          onClose={() => setRenaming(false)}
        />
      )}
    </div>
  )
}

interface ItemRowProps {
  item: Item
  currency: string
  productCatalog: Map<string, CatalogIcon>
  draggable: boolean
  onToggle: (itemId: string) => void
  onEdit: (itemId: string) => void
  onDelete: (item: Item) => void
  showSwipeHint?: boolean
}

const ItemRow = memo(function ItemRow({
  item,
  currency,
  productCatalog,
  draggable,
  onToggle,
  onEdit,
  onDelete,
  showSwipeHint,
}: ItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
  })
  const swipe = useSwipeToDelete(() => onDelete(item))
  const { peek } = swipe

  useEffect(() => {
    if (!showSwipeHint) return
    const timer = window.setTimeout(() => {
      peek()
      markSwipeHintSeen()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [showSwipeHint, peek])

  const subtotal = itemTotal(item)
  const per = QUANTITY_UNITS.find((entry) => entry.value === item.quantityUnit)?.per ?? 'unidad'
  const meta = [item.quantity,
    item.unitPrice !== undefined ? `${formatPrice(item.unitPrice, currency)}/${per}` : null,
    subtotal != null ? `${item.unitPrice !== undefined ? '= ' : ''}${formatPrice(subtotal, currency)}` : null].filter(Boolean)

  return (
    <li
      ref={setNodeRef}
      className={`${styles.itemWrapper} ${isDragging ? styles.itemDragging : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div
        className={`${styles.swipeBg} ${swipe.willDelete ? styles.swipeBgArmed : ''}`}
        aria-hidden="true"
        style={{ visibility: swipe.offset === 0 ? 'hidden' : 'visible' }}
      >
        <Icon name="trash" size={20} />
      </div>
      <div
        className={`${styles.item} ${item.done ? styles.itemDone : ''}`}
        style={{
          transform: swipe.offset ? `translateX(${swipe.offset}px)` : undefined,
          transition: swipe.animating ? 'transform 0.25s ease' : undefined,
        }}
        {...swipe.handlers}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={item.done}
          aria-label={`${item.name}${item.quantity ? `, ${item.quantity}` : ''}${subtotal !== undefined ? `, total ${formatPrice(subtotal, currency)}` : ''}`}
          className={styles.itemMain}
          onClick={() => onToggle(item.id)}
        >
          <span className={styles.checkbox}>{item.done && <Icon name="check" size={15} />}</span>
          <span className={styles.thumb}>
            <ItemThumb item={item} catalog={productCatalog} size={40} />
          </span>
          <span className={styles.itemText}>
            <span className={styles.itemName}>{item.name}</span>
            {meta.length > 0 && <span className={styles.itemMeta}>{meta.join(' · ')}</span>}
          </span>
        </button>
        <button
          type="button"
          className={`icon-btn ${styles.itemAction}`}
          onClick={() => onEdit(item.id)}
          aria-label={`Editar ${item.name}`}
        >
          <Icon name="edit" size={18} />
        </button>
        {draggable && (
          <button
            type="button"
            className={styles.dragHandle}
            aria-label={`Reordenar ${item.name}`}
            data-no-swipe
            {...attributes}
            {...listeners}
          >
            <Icon name="grip" size={18} />
          </button>
        )}
      </div>
    </li>
  )
})
