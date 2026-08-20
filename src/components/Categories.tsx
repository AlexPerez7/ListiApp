import { memo, useState, type FormEvent } from 'react'
import type { Category } from '../types'
import { ICON_OPTIONS } from '../lib/categories'
import styles from './Categories.module.css'

interface CategoriesProps {
  categories: Category[]
  loading: boolean
  onCreate: (name: string, icon: string) => void
  onUpdate: (categoryId: string, name: string, icon: string) => void
  onDelete: (categoryId: string) => void
}

export function Categories({ categories, loading, onCreate, onUpdate, onDelete }: CategoriesProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_OPTIONS[0])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, icon)
    setName('')
    setIcon(ICON_OPTIONS[0])
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

      {loading ? (
        <div className={styles.empty}>
          <p>Cargando categorías…</p>
        </div>
      ) : categories.length === 0 ? (
        <div className={styles.empty}>
          <p>Todavía no tenés categorías.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  )
}

interface CategoryRowProps {
  category: Category
  onUpdate: (categoryId: string, name: string, icon: string) => void
  onDelete: (categoryId: string) => void
}

const CategoryRow = memo(function CategoryRow({ category, onUpdate, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(category.name)
  const [iconDraft, setIconDraft] = useState(category.icon)

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

  if (editing) {
    return (
      <li className={styles.card}>
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
    <li className={styles.card}>
      <button className={styles.cardMain} onClick={startEditing}>
        <span className={styles.cardIcon}>{category.icon}</span>
        <span className={styles.cardName}>{category.name}</span>
      </button>
      <button
        className={styles.deleteButton}
        aria-label={`Eliminar categoría ${category.name}`}
        onClick={() => {
          if (confirm(`¿Eliminar la categoría "${category.name}"? Los ítems que la usan quedarán sin categoría.`)) {
            onDelete(category.id)
          }
        }}
      >
        ✕
      </button>
    </li>
  )
})
