import { Icon } from './Icon'
import styles from './OfflineBanner.module.css'

export function OfflineBanner() {
  return (
    <div className={styles.banner} role="status">
      <Icon name="wifiOff" size={15} />
      <span>Sin conexión. Los cambios no se guardan hasta que vuelvas a estar online.</span>
    </div>
  )
}
