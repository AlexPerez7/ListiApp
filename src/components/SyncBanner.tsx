import { useEffect, useState } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePendingSync } from '../hooks/usePendingSync'
import { pluralize } from '../lib/format'
import { Icon } from './Icon'
import styles from '../App.module.css'

const SLOW_SYNC_MS = 2500

// Franja superior que avisa cuando no hay conexión (los cambios quedan
// guardados en el dispositivo) o cuando la sincronización está demorando.
export function SyncBanner() {
  const online = useOnlineStatus()
  const pending = usePendingSync()
  const [slow, setSlow] = useState(false)
  const hasPending = pending > 0

  useEffect(() => {
    if (!hasPending) return
    const timer = window.setTimeout(() => setSlow(true), SLOW_SYNC_MS)
    return () => {
      window.clearTimeout(timer)
      setSlow(false)
    }
  }, [hasPending])

  if (!online) {
    return (
      <div className={styles.syncBanner} role="status">
        <Icon name="wifiOff" size={15} />
        <span>
          Sin conexión.{' '}
          {hasPending
            ? `${pluralize(pending, 'cambio guardado', 'cambios guardados')} en este dispositivo.`
            : 'Puedes seguir usando tus listas.'}
        </span>
      </div>
    )
  }

  if (hasPending && slow) {
    return (
      <div className={`${styles.syncBanner} ${styles.syncBannerSyncing}`} role="status">
        <Icon name="sync" size={14} />
        <span>Sincronizando {pluralize(pending, 'cambio', 'cambios')}…</span>
      </div>
    )
  }

  return null
}
