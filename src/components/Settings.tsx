import { useRef, type ChangeEvent } from 'react'
import type { Theme } from '../lib/theme'
import { Icon } from './Icon'
import styles from './Settings.module.css'

interface SettingsProps {
  theme: Theme
  onToggleTheme: () => void
  onExport: () => void
  onImport: (file: File) => void
  onSignOut: () => void
}

export function Settings({ theme, onToggleTheme, onExport, onImport, onSignOut }: SettingsProps) {
  const importInputRef = useRef<HTMLInputElement>(null)

  function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onImport(file)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajustes</h1>
      </header>

      <div className={styles.section}>
        <button className={styles.row} onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button className={styles.row} onClick={onExport}>
          <Icon name="download" size={18} />
          <span>Exportar datos (backup)</span>
        </button>
        <button className={styles.row} onClick={() => importInputRef.current?.click()}>
          <Icon name="upload" size={18} />
          <span>Importar backup</span>
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportChange}
          hidden
        />
      </div>

      <div className={styles.section}>
        <button className={`${styles.row} ${styles.dangerRow}`} onClick={onSignOut}>
          <Icon name="close" size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <p className={styles.version}>ListiApp v{__APP_VERSION__}</p>
    </div>
  )
}
