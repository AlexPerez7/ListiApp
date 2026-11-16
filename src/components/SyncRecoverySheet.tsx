import { useSyncExternalStore } from 'react'
import { BottomSheet } from './BottomSheet'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { confirmDialog } from '../lib/confirm'
import {
  discardFailedChange, getFailedChanges, getOutboxUser, getOutboxVersion, getPendingCount,
  getSyncIssue, retryFailedChanges, subscribeOutbox, type FailedChange,
} from '../lib/outbox'
import styles from './SyncRecoverySheet.module.css'

function names(change: FailedChange): string {
  if (change.op.kind === 'delete') return ''
  const rows = Array.isArray(change.op.values) ? change.op.values : [change.op.values]
  return rows.map((row) => row.name).filter((value): value is string => typeof value === 'string').slice(0, 3).join(', ')
}

function explanation(status: number): string {
  if (status === 403) return 'El servidor no permitió guardar este cambio. Comprueba que estás usando la cuenta correcta.'
  if (status === 409) return 'Este cambio entra en conflicto con otros datos, o el dato original ya no está disponible. Revísalo antes de reintentar.'
  return 'El servidor rechazó los datos. Puedes reintentarlo si el problema ya se resolvió, o descartarlo y volver a ingresarlos corregidos.'
}

export function SyncRecoverySheet({ onClose }: { onClose: () => void }) {
  useSyncExternalStore(subscribeOutbox, getOutboxVersion)
  const issue = useSyncExternalStore(subscribeOutbox, getSyncIssue)
  const pending = useSyncExternalStore(subscribeOutbox, getPendingCount)
  const changes = getFailedChanges()
  const owner = getOutboxUser()
  const online = useOnlineStatus()

  async function retry(ids: string[]) {
    const confirmed = await confirmDialog({
      title: '¿Volver a enviar estos cambios?',
      message: 'Se enviarán los datos originales. Si los editaste después, podrían reemplazar esas modificaciones.',
      confirmLabel: 'Reintentar', danger: false,
    })
    if (confirmed && getOutboxUser() === owner) retryFailedChanges(ids)
  }
  async function discard(id: string) {
    const confirmed = await confirmDialog({
      title: '¿Descartar este cambio?',
      message: 'Se eliminará su copia guardada en este dispositivo sin aplicarla. Los datos del servidor no se borrarán.',
      confirmLabel: 'Descartar',
    })
    if (confirmed && getOutboxUser() === owner) discardFailedChange(id)
  }

  return <BottomSheet title="Cambios por revisar" onClose={onClose}>
    <div className={styles.content}>
      <p>Estos cambios no se guardaron en tu cuenta. Su copia se conserva en este dispositivo.</p>
      {!online && <p role="status">Necesitas conexión para reintentar.</p>}
      {changes.length === 0 ? <p role="status">{pending > 0 ? issue ?? 'Enviando los cambios de nuevo…' : 'No quedan cambios por revisar.'}</p> : (
        <>
          <button type="button" className="btn btn-primary" disabled={!online || pending > 0}
            onClick={() => void retry(changes.map((change) => change.id))}>Reintentar todos</button>
          <ul className={styles.list}>
            {changes.map((change) => <li key={change.id} className={styles.change}>
              <strong>{change.label}</strong>
              {names(change) && <p>{names(change)}</p>}
              <p>{explanation(change.failure.status)}</p>
              <small>{new Date(change.failure.at).toLocaleString('es-CL')}</small>
              <div className="btn-row">
                <button type="button" className="btn" disabled={!online || pending > 0} onClick={() => void retry([change.id])}>Reintentar</button>
                <button type="button" className="btn btn-danger-soft" onClick={() => void discard(change.id)}>Descartar</button>
              </div>
            </li>)}
          </ul>
        </>
      )}
      <button type="button" className="btn" onClick={onClose}>Cerrar</button>
    </div>
  </BottomSheet>
}
