import { useRef, useSyncExternalStore, type ChangeEvent } from 'react'
import { getFailedCount, subscribeOutbox } from '../lib/outbox'
import { CURRENCIES, setCurrency, setTheme, usePrefs, type ThemePref } from '../lib/prefs'
import { pluralize } from '../lib/format'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePendingSync } from '../hooks/usePendingSync'
import { checkForUpdate, installUpdate, useUpdateStatus } from '../lib/appUpdate'
import { Icon } from './Icon'
import styles from './Settings.module.css'

interface SettingsProps {
  email?: string
  backupBusy: boolean
  backupStatus: string
  onExport: () => void
  onImport: (file: File) => void
  onSignOut: () => void
  onReviewSync: () => void
}

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export function Settings({ email, backupBusy, backupStatus, onExport, onImport, onSignOut, onReviewSync }: SettingsProps) {
  const { theme, currency } = usePrefs()
  const online = useOnlineStatus()
  const pending = usePendingSync()
  const failed = useSyncExternalStore(subscribeOutbox, getFailedCount)
  const updateStatus = useUpdateStatus()
  const importInputRef = useRef<HTMLInputElement>(null)

  function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onImport(file)
  }

  const syncText = failed > 0 ? `${pluralize(failed, 'cambio por revisar', 'cambios por revisar')}${pending > 0 ? ` · ${pending} por enviar` : ''}` : !online
    ? pending > 0
      ? `Sin conexión · ${pluralize(pending, 'cambio pendiente', 'cambios pendientes')}`
      : 'Sin conexión'
    : pending > 0
      ? `Sincronizando ${pluralize(pending, 'cambio', 'cambios')}…`
      : 'Todo sincronizado'

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Ajustes</h1>
      </header>

      <section className={styles.account}>
        <span className={styles.avatar} aria-hidden="true">
          {email?.charAt(0).toUpperCase() ?? <Icon name="user" size={22} />}
        </span>
        <div className={styles.accountText}>
          <p className={styles.accountEmail}>{email ?? 'Tu cuenta'}</p>
          <p className={`${styles.accountSync} ${online && pending === 0 && failed === 0 ? styles.accountSyncOk : ''}`}>
            <span className={styles.syncDot} />
            {syncText}
          </p>
          {failed > 0 && <button type="button" className="chip" onClick={onReviewSync}>Revisar cambios</button>}
        </div>
      </section>

      <section className={styles.group}>
        <h2 className="section-label">Apariencia</h2>
        <div className={styles.card}>
          <div className={styles.row}>
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={20} />
            <span className={styles.rowLabel}>Tema</span>
            <div className={styles.segmented} role="radiogroup" aria-label="Tema">
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.value}
                  className={`${styles.segment} ${theme === option.value ? styles.segmentActive : ''}`}
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.row}>
            <Icon name="coins" size={20} />
            <span className={styles.rowLabel}>Moneda</span>
            <select
              className={styles.select}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Moneda"
            >
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className="section-label">Tus datos</h2>
        <div className={styles.card}>
          <button type="button" className={styles.row} onClick={onExport} disabled={backupBusy || !online || pending > 0 || failed > 0}>
            <Icon name="download" size={20} />
            <span className={styles.rowLabel}>
              Exportar respaldo
              <small>{!online ? 'Necesitas conexión para incluir todas las fotos' : failed > 0 ? 'Revisa los cambios rechazados antes de exportar' : pending > 0 ? 'Espera a que se sincronicen los cambios' : 'Listas, categorías, productos, preferencias y fotos'}</small>
            </span>
            <Icon name="chevronRight" size={18} className={styles.chevron} />
          </button>
          <button type="button" className={styles.row} disabled={backupBusy} onClick={() => importInputRef.current?.click()}>
            <Icon name="upload" size={20} />
            <span className={styles.rowLabel}>
              Importar respaldo
              <small>Agrega datos sin borrar los actuales; restaura tema y moneda</small>
            </span>
            <Icon name="chevronRight" size={18} className={styles.chevron} />
          </button>
          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportChange} hidden />
        </div>
        {backupBusy && <p role="status">{backupStatus}</p>}
      </section>

      <section className={styles.group}>
        <h2 className="section-label">Aplicación</h2>
        <div className={styles.card}>
          <div className={styles.row}>
            <Icon name={updateStatus === 'available' ? 'download' : 'sync'} size={20} className={updateStatus === 'checking' ? styles.spinning : undefined} />
            <span className={styles.rowLabel}>
              {updateStatus === 'available' ? 'Nueva versión disponible' : 'Versión de la app'}
              <small aria-live="polite">
                {updateStatus === 'available'
                  ? 'Se aplicará al actualizar; tus datos no cambian'
                  : updateStatus === 'checking'
                    ? 'Buscando…'
                    : updateStatus === 'upToDate'
                      ? `Tienes la última versión (v${__APP_VERSION__})`
                      : updateStatus === 'error'
                        ? 'No se pudo comprobar. Intenta de nuevo.'
                        : !online
                          ? 'Necesitas conexión para buscar'
                          : `Versión instalada: v${__APP_VERSION__}`}
              </small>
            </span>
            <button
              type="button"
              className={styles.updateButton}
              onClick={updateStatus === 'available' ? installUpdate : () => void checkForUpdate()}
              disabled={updateStatus === 'checking' || (updateStatus !== 'available' && !online)}
            >
              {updateStatus === 'available' ? 'Actualizar' : updateStatus === 'checking' ? 'Buscando…' : 'Buscar actualización'}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.card}>
          <button type="button" className={`${styles.row} ${styles.rowDanger}`} disabled={backupBusy} onClick={onSignOut}>
            <Icon name="logout" size={20} />
            <span className={styles.rowLabel}>Cerrar sesión</span>
          </button>
        </div>
      </section>

      <p className={styles.version}>ListiApp v{__APP_VERSION__}</p>
    </div>
  )
}
