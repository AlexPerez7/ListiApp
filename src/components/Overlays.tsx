import { useSyncExternalStore } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { createPortal } from 'react-dom'
import { getConfirm, resolveConfirm, subscribeConfirm, type ActiveConfirm } from '../lib/confirm'
import { getToast, runToastAction, subscribeToast } from '../lib/toast'
import { Icon } from './Icon'
import styles from './Overlays.module.css'

interface ToastHostProps {
  /** Deja espacio para la barra de pestañas inferior. */
  aboveTabs: boolean
}

export function ToastHost({ aboveTabs }: ToastHostProps) {
  const toast = useSyncExternalStore(subscribeToast, getToast)
  if (!toast) return null

  return createPortal(
    <div
      key={toast.id}
      className={`${styles.toast} ${aboveTabs ? styles.toastAboveTabs : ''}`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
    >
      {toast.kind !== 'info' && (
        <span className={toast.kind === 'error' ? styles.toastIconError : styles.toastIconSuccess}>
          <Icon name={toast.kind === 'error' ? 'alert' : 'check'} size={18} />
        </span>
      )}
      <span className={styles.toastMessage}>{toast.message}</span>
      {toast.actionLabel && (
        <button type="button" className={styles.toastAction} onClick={runToastAction}>
          {toast.actionLabel}
        </button>
      )}
    </div>,
    document.body,
  )
}

export function ConfirmHost() {
  const confirm = useSyncExternalStore(subscribeConfirm, getConfirm)
  return confirm ? <ConfirmDialog confirm={confirm} /> : null
}

function ConfirmDialog({ confirm }: { confirm: ActiveConfirm }) {
  const dialogRef = useDialogFocus(true, () => resolveConfirm(false))
  const danger = confirm.danger ?? true

  return createPortal(
    <div className={styles.confirmOverlay} onClick={() => resolveConfirm(false)}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={styles.confirm}
        role="alertdialog"
        aria-modal="true"
        aria-label={confirm.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.confirmTitle}>{confirm.title}</h2>
        {confirm.message && <p className={styles.confirmMessage}>{confirm.message}</p>}
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => resolveConfirm(false)}>
            {confirm.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => resolveConfirm(true)}
          >
            {confirm.confirmLabel ?? 'Eliminar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
