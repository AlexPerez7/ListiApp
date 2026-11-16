import { memo, useMemo, useState, type FormEvent } from 'react'
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
import type { Category, ShoppingList } from '../types'
import { ICON_OPTIONS } from '../lib/categories'
import { confirmDialog } from '../lib/confirm'
import { pluralize } from '../lib/format'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { EmojiGrid } from './Pickers'
import { SkeletonList } from './Skeleton'
import styles from './Categories.module.css'

interface CategoriesProps {
  categories: Category[]
  lists: ShoppingList[]
  loading: boolean
  onCreate: (name: string, icon: string) => void
  onUpdate: (categoryId: string, name: string, icon: string) => void
  onDelete: (categoryId: string) => void
  onReorder: (orderedCategoryIds: string[]) => void
}

const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export function Categories({ categories, lists, loading, onCreate, onUpdate, onDelete, onReorder }: CategoriesProps) {
  // null = cerrado, 'new' = creando, otro valor = id de la categoría en edición
  const [sheet, setSheet] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const usageById = useMemo(() => {
    const usage = new Map<string, number>()
    for (const list of lists) {
      for (const item of list.items) {
        if (item.categoryId) usage.set(item.categoryId, (usage.get(item.categoryId) ?? 0) + 1)
      }
    }
    return usage
  }, [lists])

  const editing = sheet && sheet !== 'new' ? categories.find((category) => category.id === sheet) : undefined

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = categories.map((category) => category.id)
    const activeIndex = ids.indexOf(String(active.id))
    const overIndex = ids.indexOf(String(over.id))
    if (activeIndex === -1 || overIndex === -1) return
    onReorder(arrayMove(ids, activeIndex, overIndex))
  }

  async function handleDelete(category: Category) {
    const usage = usageById.get(category.id) ?? 0
    const confirmed = await confirmDialog({
      title: `¿Eliminar «${category.name}»?`,
      message:
        usage > 0
          ? `${pluralize(usage, 'ítem quedará', 'ítems quedarán')} sin categoría.`
          : 'Ningún ítem usa esta categoría.',
    })
    if (confirmed) onDelete(category.id)
  }

  return (
    <div className="page page-with-fab">
      <header className="page-header">
        <h1 className="page-title">Categorías</h1>
        <p className="page-subtitle">Agrupan tus ítems por pasillo. Arrástralas para ordenarlas como tu recorrido.</p>
      </header>

      {loading ? (
        <SkeletonList count={4} />
      ) : categories.length === 0 ? (
        <div className="empty">
          <div className="empty-art">🏷️</div>
          <p className="empty-title">Sin categorías</p>
          <p>Crea categorías para ordenar tus listas por pasillo.</p>
          <button type="button" className="btn btn-accent" onClick={() => setSheet('new')}>
            <Icon name="plus" size={18} />
            Nueva categoría
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} modifiers={[lockToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.list}>
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  usage={usageById.get(category.id) ?? 0}
                  onEdit={setSheet}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {categories.length > 0 && (
        <div className="fab-layer">
          <button type="button" className="fab fab-above-tabs" onClick={() => setSheet('new')}>
            <Icon name="plus" size={22} />
            Nueva
          </button>
        </div>
      )}

      {sheet === 'new' && (
        <CategorySheet
          title="Nueva categoría"
          onSave={onCreate}
          onClose={() => setSheet(null)}
        />
      )}
      {editing && (
        <CategorySheet
          key={editing.id}
          title="Editar categoría"
          category={editing}
          onSave={(name, icon) => onUpdate(editing.id, name, icon)}
          onDelete={() => void handleDelete(editing)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

interface CategoryRowProps {
  category: Category
  usage: number
  onEdit: (categoryId: string) => void
}

const CategoryRow = memo(function CategoryRow({ category, usage, onEdit }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

  return (
    <li
      ref={setNodeRef}
      className={`${styles.row} ${isDragging ? styles.rowDragging : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button type="button" className={styles.rowMain} onClick={() => onEdit(category.id)}>
        <span className={styles.rowIcon} aria-hidden="true">
          {category.icon}
        </span>
        <span className={styles.rowText}>
          <span className={styles.rowName}>{category.name}</span>
          <span className={styles.rowMeta}>{usage === 0 ? 'Sin ítems' : pluralize(usage, 'ítem', 'ítems')}</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Reordenar ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={18} />
      </button>
    </li>
  )
})

interface CategorySheetProps {
  title: string
  category?: Category
  onSave: (name: string, icon: string) => void
  onDelete?: () => void
  onClose: () => void
}

function CategorySheet({ title, category, onSave, onDelete, onClose }: CategorySheetProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? ICON_OPTIONS[0])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed, icon)
    onClose()
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <span className={styles.iconPreview} aria-hidden="true">
            {icon}
          </span>
          <input
            className="input"
            type="text"
            placeholder="Nombre (ej: Fiambrería)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            enterKeyHint="done"
            aria-label="Nombre de la categoría"
            autoFocus={!category}
          />
        </div>
        <EmojiGrid options={ICON_OPTIONS} value={icon} onChange={setIcon} />
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
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {category ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
