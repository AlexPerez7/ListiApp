import { describe, expect, it } from 'vitest'
import { buildCatalogMap, getCatalogIcon, missingDefaultProducts } from '../productCatalog'

describe('catálogo general y personal', () => {
  it('reconoce sinónimos sin quitar prioridad a las elecciones del usuario', () => {
    const catalog = buildCatalogMap([
      { id: '1', name: 'avena', iconKey: 'oats' },
      { id: '2', name: 'palta', iconKey: 'avocado' },
      { id: '3', name: 'aguacate', iconKey: 'apple' },
    ])
    expect(getCatalogIcon(catalog, 'Avena integral')?.iconKey).toBe('oats')
    expect(getCatalogIcon(catalog, 'aguacate')?.iconKey).toBe('apple')
    expect(getCatalogIcon(catalog, 'sin coincidencia')).toBeUndefined()
  })
  it('actualizar el catálogo base no duplica sinónimos o nombres con acentos', () => {
    const missing = missingDefaultProducts([{ name: 'banana' }, { name: 'chia' }, { name: 'avena' }])
    expect(missing.some((entry) => ['plátano', 'chía', 'avena'].includes(entry.name))).toBe(false)
    expect(missing.some((entry) => entry.name === 'frutos secos')).toBe(true)
  })
})
