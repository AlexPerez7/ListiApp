import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

let openSheets = 0

// Panel inferior modal. Se dibuja en <body> (portal) para no heredar
// transformaciones ni recortes de la fila que lo abre, bloquea el scroll del
// fondo, se cierra con Escape o tocando fuera, y se mantiene visible sobre
// el teclado en pantalla.
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const titleId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    openSheets++
    document.body.classList.add('scroll-locked')

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    // En iOS el teclado tapa los elementos fijos al borde inferior: subimos
    // el panel lo que mida el teclado.
    const viewport = window.visualViewport
    const adjustForKeyboard = () => {
      if (!viewport || !overlayRef.current) return
      const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      overlayRef.current.style.setProperty('--keyboard-inset', `${hidden}px`)
    }
    adjustForKeyboard()
    viewport?.addEventListener('resize', adjustForKeyboard)
    viewport?.addEventListener('scroll', adjustForKeyboard)

    return () => {
      openSheets--
      if (openSheets === 0) document.body.classList.remove('scroll-locked')
      document.removeEventListener('keydown', onKeyDown)
      viewport?.removeEventListener('resize', adjustForKeyboard)
      viewport?.removeEventListener('scroll', adjustForKeyboard)
    }
  }, [])

  return createPortal(
    <div ref={overlayRef} className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

interface ActionSheetItem {
  label: string
  icon: Parameters<typeof Icon>[0]['name']
  onSelect: () => void
  danger?: boolean
}

interface ActionSheetProps {
  title: string
  actions: ActionSheetItem[]
  onClose: () => void
}

/** Menú de acciones (lo que en escritorio sería un menú contextual). */
export function ActionSheet({ title, actions, onClose }: ActionSheetProps) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      <ul className={styles.actions}>
        {actions.map((action) => (
          <li key={action.label}>
            <button
              type="button"
              className={`${styles.action} ${action.danger ? styles.actionDanger : ''}`}
              onClick={() => {
                onClose()
                action.onSelect()
              }}
            >
              <Icon name={action.icon} size={20} />
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}
