// Renderiza la ilustración (dibujada o foto real) de un producto, buscando
// su clave en las tablas definidas en lib/productIcons.tsx.
import { ICONS, PHOTOS } from '../lib/productIcons'

interface ProductIconProps {
  iconKey: string
  size?: number
  className?: string
}

export function ProductIcon({ iconKey, size = 20, className }: ProductIconProps) {
  const photo = PHOTOS[iconKey]
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={className}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  const icon = ICONS[iconKey]
  if (!icon) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* Contorno parejo tipo emoji: las formas sin stroke propio heredan este
          borde oscuro; las que ya definen su propio stroke (detalles internos)
          lo conservan sin cambios. */}
      <g stroke="rgba(30, 20, 10, 0.35)" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round">
        {icon}
      </g>
    </svg>
  )
}
