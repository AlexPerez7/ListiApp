import { useRef, type ChangeEvent } from 'react'
import { CURRENCIES, setCurrency, setTheme, usePrefs, type ThemePref } from '../lib/prefs'
import { pluralize } from '../lib/format'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePendingSync } from '../hooks/usePendingSync'
import { Icon } from './Icon'
import styles from './Settings.module.css'

interface SettingsProps {
  email?: string
  listCount: number
  onExport: () => void
  onImport: (file: File) => void
  onSignOut: () => void
}

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export function Settings({ email, listCount, onExport, onImport, onSignOut }: SettingsProps) {
  const { theme, currency } = usePrefs()
  const online = useOnlineStatus()
  const pending = usePendingSync()
  const importInputRef = useRef<HTMLInputElement>(null)

  function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onImport(file)
  }

  const syncText = !online
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
          <p className={`${styles.accountSync} ${online && pending === 0 ? styles.accountSyncOk : ''}`}>
            <span className={styles.syncDot} />
            {syncText}
          </p>
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
          <button type="button" className={styles.row} onClick={onExport} disabled={listCount === 0}>
            <Icon name="download" size={20} />
            <span className={styles.rowLabel}>
              Exportar respaldo
              <small>{listCount === 0 ? 'Aún no tienes listas' : `${pluralize(listCount, 'lista', 'listas')} en un archivo JSON`}</small>
            </span>
            <Icon name="chevronRight" size={18} className={styles.chevron} />
          </button>
          <button type="button" className={styles.row} onClick={() => importInputRef.current?.click()}>
            <Icon name="upload" size={20} />
            <span className={styles.rowLabel}>
              Importar respaldo
              <small>Agrega las listas del archivo sin borrar las actuales</small>
            </span>
            <Icon name="chevronRight" size={18} className={styles.chevron} />
          </button>
          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportChange} hidden />
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.card}>
          <button type="button" className={`${styles.row} ${styles.rowDanger}`} onClick={onSignOut}>
            <Icon name="logout" size={20} />
            <span className={styles.rowLabel}>Cerrar sesión</span>
          </button>
        </div>
      </section>

      <p className={styles.version}>ListiApp v{__APP_VERSION__}</p>
    </div>
  )
}
