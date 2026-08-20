import styles from './Skeleton.module.css'

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.line} style={{ width: '60%' }} />
      <div className={styles.lineSmall} style={{ width: '35%' }} />
    </div>
  )
}

interface SkeletonListProps {
  count?: number
}

export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
