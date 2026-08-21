import { memo, useMemo, useState, type FormEvent } from 'react'
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
import type { Category } from '../types'
import { ICON_OPTIONS } from '../lib/categories'
import { Icon } from './Icon'
import { SkeletonList } from './Skeleton'
import styles from './Categories.module.css'

interface CategoriesProps {
  categories: Category[]
  loading: boolean
  onCreate: (name: string, icon: string) => void
  onUpdate: (categoryId: string, name: string, icon: string) => void
  onDelete: (categoryId: string) => void
  onReorder: (orderedCategoryIds: string[]) => void
  onConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
}

export function Categories({ categories, loading, onCreate, onUpdate, onDelete, onReorder, onConfirm }: CategoriesProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_OPTIONS[0])
  const [query, setQuery] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, icon)
    setName('')
    setIcon(ICON_OPTIONS[0])
  }

  const filteredCategories = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return categories
    return categories.filter((category) => category.name.toLowerCase().includes(trimmed))
  }, [categories, query])

  const isFiltering = query.trim().length > 0

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ids = categories.map((category) => category.id)
    const activeIndex = ids.indexOf(String(active.id))
    const overIndex = ids.indexOf(String(over.id))
    if (activeIndex === -1 || overIndex === -1) return
    onReorder(arrayMove(ids, activeIndex, overIndex))
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Categorías</h1>
        <p className={styles.subtitle}>Organizá tus ítems por pasillo o tipo</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.iconPicker}>
          {ICON_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.iconOption} ${option === icon ? styles.iconOptionSelected : ''}`}
              onClick={() => setIcon(option)}
              aria-label={`Usar ícono ${option}`}
              aria-pressed={option === icon}
            >
              {option}
            </button>
          ))}
        </div>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Nueva categoría (ej: Fiambrería)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className={styles.addButton} type="submit" disabled={!name.trim()}>
            Crear
          </button>
        </div>
      </form>

      {categories.length > 5 && (
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar categoría…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar categoría"
        />
      )}

      {loading ? (
        <SkeletonList count={4} />
      ) : categories.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="tag" size={40} className={styles.emptyIcon} />
          <p>Todavía no tenés categorías.</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className={styles.empty}>
          <p>Ninguna categoría coincide con "{query}".</p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.list}>
              {filteredCategories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  draggable={!isFiltering}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onConfirm={onConfirm}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

interface CategoryRowProps {
  category: Category
  draggable: boolean
  onUpdate: (categoryId: string, name: string, icon: string) => void
  onDelete: (categoryId: string) => void
  onConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
}

const CategoryRow = memo(function CategoryRow({ category, draggable, onUpdate, onDelete, onConfirm }: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(category.name)
  const [iconDraft, setIconDraft] = useState(category.icon)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: !draggable,
  })
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  }

  function startEditing() {
    setNameDraft(category.name)
    setIconDraft(category.icon)
    setEditing(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    onUpdate(category.id, trimmed, iconDraft)
    setEditing(false)
  }

  async function handleDelete() {
    if (
      await onConfirm(`¿Eliminar la categoría "${category.name}"? Los ítems que la usan quedarán sin categoría.`)
    ) {
      onDelete(category.id)
    }
  }

  if (editing) {
    return (
      <li ref={setNodeRef} style={dragStyle} className={styles.card}>
        <form className={styles.editForm} onSubmit={handleSubmit}>
          <div className={styles.iconPicker}>
            {ICON_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.iconOption} ${option === iconDraft ? styles.iconOptionSelected : ''}`}
                onClick={() => setIconDraft(option)}
                aria-label={`Usar ícono ${option}`}
                aria-pressed={option === iconDraft}
              >
                {option}
              </button>
            ))}
          </div>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
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
    <li ref={setNodeRef} style={dragStyle} className={styles.card}>
      {draggable && (
        <button className={styles.dragHandle} aria-label={`Reordenar ${category.name}`} {...attributes} {...listeners}>
          <Icon name="grip" size={16} />
        </button>
      )}
      <button className={styles.cardMain} onClick={startEditing}>
        <span className={styles.cardIcon}>{category.icon}</span>
        <span className={styles.cardName}>{category.name}</span>
      </button>
      <button className={styles.deleteButton} aria-label={`Eliminar categoría ${category.name}`} onClick={handleDelete}>
        <Icon name="close" size={17} />
      </button>
    </li>
  )
})
