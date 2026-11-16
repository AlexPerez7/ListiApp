import type { Category } from '../types'
import { ALL_ICON_KEYS } from '../lib/productIcons'
import { ProductIcon } from './ProductIcon'
import styles from './Pickers.module.css'

interface CategoryChipsProps {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
}

/** Selector de categoría de un toque (en vez de un menú desplegable). */
export function CategoryChips({ categories, value, onChange }: CategoryChipsProps) {
  return (
    <div className="chip-scroll" role="radiogroup" aria-label="Categoría">
      <button
        type="button"
        role="radio"
        aria-checked={value === ''}
        className={`chip ${value === '' ? 'chip-selected' : ''}`}
        onClick={() => onChange('')}
      >
        Sin categoría
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="radio"
          aria-checked={value === category.id}
          className={`chip ${value === category.id ? 'chip-selected' : ''}`}
          onClick={() => onChange(category.id)}
        >
          <span aria-hidden="true">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  )
}

interface ProductIconGridProps {
  value?: string
  onChange: (iconKey: string) => void
}

export function ProductIconGrid({ value, onChange }: ProductIconGridProps) {
  return (
    <div className={styles.iconGrid}>
      {ALL_ICON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`${styles.iconOption} ${key === value ? styles.iconOptionSelected : ''}`}
          onClick={() => onChange(key)}
          aria-label={`Ícono ${key}`}
          aria-pressed={key === value}
        >
          <ProductIcon iconKey={key} size={30} />
        </button>
      ))}
    </div>
  )
}

interface EmojiGridProps {
  options: string[]
  value: string
  onChange: (emoji: string) => void
}

export function EmojiGrid({ options, value, onChange }: EmojiGridProps) {
  return (
    <div className={styles.iconGrid}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.iconOption} ${styles.emojiOption} ${option === value ? styles.iconOptionSelected : ''}`}
          onClick={() => onChange(option)}
          aria-label={`Ícono ${option}`}
          aria-pressed={option === value}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
