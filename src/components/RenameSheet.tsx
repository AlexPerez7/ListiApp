import { useState, type FormEvent } from 'react'
import { BottomSheet } from './BottomSheet'
import styles from './Home.module.css'

interface RenameSheetProps {
  title: string
  initialName: string
  onSave: (name: string) => void
  onClose: () => void
}

export function RenameSheet({ title, initialName, onSave, onClose }: RenameSheetProps) {
  const [name, setName] = useState(initialName)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed !== initialName) onSave(trimmed)
    onClose()
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form className={styles.sheetForm} onSubmit={handleSubmit}>
        <input
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          maxLength={80}
          enterKeyHint="done"
          aria-label="Nombre"
          autoFocus
        />
        <button className="btn btn-primary btn-block" type="submit" disabled={!name.trim()}>
          Guardar
        </button>
      </form>
    </BottomSheet>
  )
}
