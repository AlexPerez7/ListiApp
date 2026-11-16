import type { Tab } from '../hooks/useRoute'
import { Icon, type IconName } from './Icon'
import { useUpdateStatus } from '../lib/appUpdate'
import styles from './TabBar.module.css'

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'lists', label: 'Listas', icon: 'list' },
  { id: 'categories', label: 'Categorías', icon: 'tag' },
  { id: 'products', label: 'Productos', icon: 'cart' },
  { id: 'history', label: 'Historial', icon: 'history' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
]

export function TabBar({ active, onChange }: TabBarProps) {
  const updateAvailable = useUpdateStatus() === 'available'

  return (
    <nav className={styles.tabBar} aria-label="Secciones">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${tab.id === active ? styles.tabActive : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={tab.id === active ? 'page' : undefined}
        >
          <span className={styles.iconPill}>
            <Icon name={tab.icon} size={21} />
            {tab.id === 'settings' && updateAvailable && <span className={styles.badge} aria-label="Actualización disponible" />}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
