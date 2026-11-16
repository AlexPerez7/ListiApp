// Catálogo de productos predefinidos: mapea el nombre de un producto común
// de supermercado a la clave de una ilustración (ver components/ProductIcon.tsx),
// para mostrar una miniatura aunque el usuario no haya subido su propia foto.
// Si el usuario sube una foto real, esta siempre tiene prioridad (ver ItemRow
// en ListDetail.tsx).
//
// El catálogo vive en la tabla product_catalog (ver useProductCatalog): cada
// usuario tiene el suyo, sembrado una vez con DEFAULT_PRODUCT_CATALOG, y puede
// agregar, renombrar o borrar entradas desde la pantalla de Productos.
import type { ProductCatalogEntry } from '../types'

export const DEFAULT_PRODUCT_CATALOG: { name: string; iconKey: string }[] = [
  // Frutas
  { name: 'manzana', iconKey: 'apple' },
  { name: 'naranja', iconKey: 'citrus' },
  { name: 'mandarina', iconKey: 'citrus' },
  { name: 'limon', iconKey: 'lemon' },
  { name: 'plátano', iconKey: 'banana' },
  { name: 'pera', iconKey: 'pear' },
  { name: 'uva', iconKey: 'grapes' },
  { name: 'sandia', iconKey: 'watermelon' },
  { name: 'frutilla', iconKey: 'strawberry' },
  { name: 'piña', iconKey: 'pineapple' },
  { name: 'palta', iconKey: 'avocado' },

  // Verduras
  { name: 'tomate', iconKey: 'tomato' },
  { name: 'papa', iconKey: 'potato' },
  { name: 'cebolla', iconKey: 'onion' },
  { name: 'zanahoria', iconKey: 'carrot' },
  { name: 'lechuga', iconKey: 'leafy' },
  { name: 'brócoli', iconKey: 'broccoli' },
  { name: 'coliflor', iconKey: 'cauliflower' },
  { name: 'pepino', iconKey: 'cucumber' },
  { name: 'maiz', iconKey: 'corn' },
  { name: 'choclo', iconKey: 'corn' },
  { name: 'ajo', iconKey: 'garlic' },
  { name: 'apio', iconKey: 'celery' },
  { name: 'pimiento', iconKey: 'pepper' },
  { name: 'pimenton', iconKey: 'pepper' },
  { name: 'ají', iconKey: 'cayenne' },

  // Carnes y pescados
  { name: 'carne molida', iconKey: 'meat' },
  { name: 'bistec', iconKey: 'steak' },
  { name: 'asado', iconKey: 'asado' },
  { name: 'pollo', iconKey: 'chicken' },
  { name: 'pechuga', iconKey: 'chicken' },
  { name: 'nuggets', iconKey: 'nuggets' },
  { name: 'pescado', iconKey: 'fish' },
  { name: 'atun', iconKey: 'tuna' },
  { name: 'jamón', iconKey: 'ham' },
  { name: 'hamburguesa', iconKey: 'pattyRaw' },
  { name: 'medallon', iconKey: 'pattyRaw' },
  { name: 'vienesa', iconKey: 'sausage' },

  // Lácteos y huevos
  { name: 'leche', iconKey: 'milk' },
  { name: 'yogurt', iconKey: 'yogurt' },
  { name: 'queso', iconKey: 'cheese' },
  { name: 'mantequilla', iconKey: 'butter' },
  { name: 'crema', iconKey: 'cream' },
  { name: 'huevo', iconKey: 'egg' },

  // Panadería
  { name: 'pan', iconKey: 'bread' },
  { name: 'tostadas', iconKey: 'bread' },
  { name: 'galleta', iconKey: 'cookie' },
  { name: 'torta', iconKey: 'cake' },

  // Almacén
  { name: 'arroz', iconKey: 'rice' },
  { name: 'avena', iconKey: 'oats' },
  { name: 'fideos', iconKey: 'pasta' },
  { name: 'pasta', iconKey: 'pasta' },
  { name: 'harina', iconKey: 'flour' },
  { name: 'azúcar', iconKey: 'sugar' },
  { name: 'sal', iconKey: 'salt' },
  { name: 'mayonesa', iconKey: 'mayonnaise' },
  { name: 'ketchup', iconKey: 'ketchup' },
  { name: 'mostaza', iconKey: 'mustard' },
  { name: 'aceite', iconKey: 'oil' },

  // Bebidas
  { name: 'café', iconKey: 'coffee' },
  { name: 'té', iconKey: 'tea' },
  { name: 'yerba mate', iconKey: 'mate' },
  { name: 'agua', iconKey: 'water' },
  { name: 'bebida', iconKey: 'soda' },
  { name: 'jugo', iconKey: 'juice' },
  { name: 'cerveza', iconKey: 'beer' },
  { name: 'vino', iconKey: 'wine' },

  // Dulces y congelados
  { name: 'chocolate', iconKey: 'chocolate' },
  { name: 'helado', iconKey: 'iceCream' },
  { name: 'hielo', iconKey: 'ice' },

  // Frutos secos, semillas y untables
  { name: 'fruta congelada', iconKey: 'frozenFruit' },
  { name: 'pasta de maní', iconKey: 'peanutButter' },
  { name: 'frutos secos', iconKey: 'mixedNuts' },
  { name: 'chía', iconKey: 'chia' },

  // Limpieza e higiene
  { name: 'detergente', iconKey: 'cleaning' },
  { name: 'cloro', iconKey: 'bleach' },
  { name: 'jabón', iconKey: 'soap' },
  { name: 'jabón líquido', iconKey: 'liquidSoap' },
  { name: 'shampoo', iconKey: 'shampoo' },
  { name: 'champú', iconKey: 'shampoo' },
  { name: 'desodorante', iconKey: 'deodorant' },
  { name: 'papel', iconKey: 'paper' },
  { name: 'papel higiénico', iconKey: 'paper' },
  { name: 'pañales', iconKey: 'diaper' },
]

export function normalizeProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

// Sinónimos conocidos; las coincidencias exactas del catálogo personal tienen prioridad.
const PRODUCT_ALIASES: Record<string, string> = {
  banana: 'platano', banano: 'platano', aguacate: 'palta',
  mate: 'yerba mate', yerba: 'yerba mate', yogur: 'yogurt',
  'mantequilla de mani': 'pasta de mani', 'crema de mani': 'pasta de mani',
  'avena integral': 'avena',
}

export function canonicalProductName(name: string): string {
  const normalized = normalizeProductName(name)
  return PRODUCT_ALIASES[normalized] ?? normalized
}

export function missingDefaultProducts(entries: Pick<ProductCatalogEntry, 'name'>[]) {
  const existing = new Set(entries.map((entry) => canonicalProductName(entry.name)))
  return DEFAULT_PRODUCT_CATALOG.filter((entry) => !existing.has(canonicalProductName(entry.name)))
}

export interface CatalogIcon {
  iconKey: string
  imageUrl?: string
}

export function buildCatalogMap(entries: ProductCatalogEntry[]): Map<string, CatalogIcon> {
  const map = new Map<string, CatalogIcon>()
  for (const entry of entries) {
    map.set(normalizeProductName(entry.name), { iconKey: entry.iconKey, imageUrl: entry.imageUrl })
  }
  return map
}

export function getCatalogIcon(catalog: Map<string, CatalogIcon>, name: string): CatalogIcon | undefined {
  const exact = catalog.get(normalizeProductName(name))
  if (exact) return exact
  const canonical = canonicalProductName(name)
  return catalog.get(canonical) ?? [...catalog].find(([key]) => canonicalProductName(key) === canonical)?.[1]
}
