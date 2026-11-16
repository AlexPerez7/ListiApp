import { SkeletonList } from './Skeleton'

export function ScreenLoading() {
  return <div className="page" role="status" aria-label="Cargando pantalla">
    <SkeletonList count={4} />
  </div>
}
