import { memo } from 'react'
import type { Item } from '../types'
import { getCatalogIcon, type CatalogIcon } from '../lib/productCatalog'
import { ProductIcon } from './ProductIcon'

interface ItemThumbProps {
  item: Pick<Item, 'name' | 'imageUrl' | 'iconKey'>
  catalog: Map<string, CatalogIcon>
  size?: number
}

// Tonos para la inicial de los productos sin imagen: siempre el mismo para
// un mismo nombre.
const INITIAL_HUES = [158, 22, 210, 280, 45, 340, 190, 100]

function hueFor(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return INITIAL_HUES[Math.abs(hash) % INITIAL_HUES.length]
}

// Miniatura de un ítem. Prioridad: foto propia, ícono elegido a mano, foto o
// ícono del catálogo según el nombre y, si no hay nada, la inicial.
export const ItemThumb = memo(function ItemThumb({ item, catalog, size = 44 }: ItemThumbProps) {
  const fromCatalog = item.imageUrl || item.iconKey ? undefined : getCatalogIcon(catalog, item.name)
  const imageUrl = item.imageUrl ?? fromCatalog?.imageUrl
  const iconKey = item.iconKey ?? fromCatalog?.iconKey
  const box = { width: size, height: size, flexShrink: 0 }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ ...box, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  if (iconKey) {
    return (
      <span style={{ ...box, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <ProductIcon iconKey={iconKey} size={Math.round(size * 0.82)} />
      </span>
    )
  }

  const hue = hueFor(item.name)
  return (
    <span
      aria-hidden="true"
      style={{
        ...box,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: `hsl(${hue} 60% 50% / 0.16)`,
        color: `hsl(${hue} 55% 42%)`,
        fontSize: Math.round(size * 0.42),
        fontWeight: 800,
        textTransform: 'uppercase',
      }}
    >
      {item.name.trim().charAt(0) || '?'}
    </span>
  )
})
