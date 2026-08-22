import { Icon, type IconName } from './Icon'
import styles from './TabBar.module.css'

export type Tab = 'lists' | 'categories' | 'products' | 'settings'

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'lists', label: 'Listas', icon: 'list' },
  { id: 'categories', label: 'Categorías', icon: 'tag' },
  { id: 'products', label: 'Productos', icon: 'cart' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
]

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className={styles.tabBar}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${tab.id === active ? styles.tabActive : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={tab.id === active ? 'page' : undefined}
        >
          <Icon name={tab.icon} size={22} />
          <span className={styles.tabLabel}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
