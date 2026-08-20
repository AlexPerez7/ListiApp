import { memo, useCallback, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Item, ShoppingList } from '../types'
import styles from './ListDetail.module.css'

interface ListDetailProps {
  list: ShoppingList
  onBack: () => void
  onAddItem: (name: string, quantity?: string) => void
  onUpdateItem: (itemId: string, name: string, quantity?: string) => void
  onToggleItem: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onClearCompleted: () => void
  onUpdateListName: (name: string) => void
  onDeleteList: () => void
}

function buildShareText(list: ShoppingList): string {
  const pending = list.items.filter((item) => !item.done)
  const source = pending.length > 0 ? pending : list.items
  if (source.length === 0) return `${list.name}\n\nSin ítems.`
  const lines = source.map((item) => `- ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`)
  return `${list.name}\n\n${lines.join('\n')}`
}

export function ListDetail({
  list,
  onBack,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
  onUpdateListName,
  onDeleteList,
}: ListDetailProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(list.name)
  const [shareStatus, setShareStatus] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAddItem(trimmed, quantity)
    setName('')
    setQuantity('')
  }

  const pending = useMemo(() => list.items.filter((item) => !item.done), [list.items])
  const done = useMemo(() => list.items.filter((item) => item.done), [list.items])

  const handleToggle = useCallback((itemId: string) => onToggleItem(itemId), [onToggleItem])
  const handleDelete = useCallback((itemId: string) => onDeleteItem(itemId), [onDeleteItem])
  const handleSave = useCallback(
    (itemId: string, itemName: string, itemQuantity?: string) => onUpdateItem(itemId, itemName, itemQuantity),
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
          ←
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
          </p>
        </div>
        <button className={styles.iconButton} aria-label="Compartir lista" onClick={handleShare}>
          ⇪
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
          ✕
        </button>
      </header>

      {shareStatus && <p className={styles.shareStatus}>{shareStatus}</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
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
          +
        </button>
      </form>

      {list.items.length === 0 ? (
        <div className={styles.empty}>
          <p>Agrega tu primer ítem arriba.</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {pending.length > 0 && (
            <ul className={styles.itemList}>
              {pending.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onSave={handleSave}
                />
              ))}
            </ul>
          )}
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
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onSave={handleSave}
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
  onToggle: (itemId: string) => void
  onDelete: (itemId: string) => void
  onSave: (itemId: string, name: string, quantity?: string) => void
}

const ItemRow = memo(function ItemRow({ item, onToggle, onDelete, onSave }: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(item.name)
  const [quantityDraft, setQuantityDraft] = useState(item.quantity ?? '')

  function startEditing() {
    setNameDraft(item.name)
    setQuantityDraft(item.quantity ?? '')
    setEditing(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    onSave(item.id, trimmed, quantityDraft)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className={styles.item}>
        <form className={styles.editForm} onSubmit={handleSubmit}>
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
          <button className={styles.editSaveButton} type="submit" disabled={!nameDraft.trim()}>
            ✓
          </button>
          <button className={styles.editCancelButton} type="button" onClick={() => setEditing(false)}>
            ✕
          </button>
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
        {item.done && <span className={styles.checkmark}>✓</span>}
      </button>
      <button className={styles.itemMain} onClick={() => onToggle(item.id)}>
        <span className={styles.itemName}>{item.name}</span>
        {item.quantity && <span className={styles.itemQty}>{item.quantity}</span>}
      </button>
      <button className={styles.itemEdit} onClick={startEditing} aria-label={`Editar ${item.name}`}>
        ✎
      </button>
      <button className={styles.itemDelete} onClick={() => onDelete(item.id)} aria-label={`Eliminar ${item.name}`}>
        ✕
      </button>
    </li>
  )
})
