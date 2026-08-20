import styles from './Toast.module.css'

interface ToastProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div className={styles.toast} role="status">
      <span className={styles.message}>{message}</span>
      {actionLabel && onAction && (
        <button className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
