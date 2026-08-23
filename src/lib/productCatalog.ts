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
  { name: 'banana', iconKey: 'banana' },
  { name: 'banano', iconKey: 'banana' },
  { name: 'pera', iconKey: 'pear' },
  { name: 'uva', iconKey: 'grapes' },
  { name: 'sandia', iconKey: 'watermelon' },
  { name: 'frutilla', iconKey: 'strawberry' },
  { name: 'piña', iconKey: 'pineapple' },
  { name: 'palta', iconKey: 'avocado' },
  { name: 'aguacate', iconKey: 'avocado' },

  // Verduras
  { name: 'tomate', iconKey: 'tomato' },
  { name: 'papa', iconKey: 'potato' },
  { name: 'cebolla', iconKey: 'onion' },
  { name: 'zanahoria', iconKey: 'carrot' },
  { name: 'lechuga', iconKey: 'leafy' },
  { name: 'brocoli', iconKey: 'leafy' },
  { name: 'pepino', iconKey: 'cucumber' },
  { name: 'maiz', iconKey: 'corn' },
  { name: 'choclo', iconKey: 'corn' },
  { name: 'ajo', iconKey: 'garlic' },
  { name: 'apio', iconKey: 'celery' },
  { name: 'pimiento', iconKey: 'pepper' },
  { name: 'pimenton', iconKey: 'pepper' },
  { name: 'ají cayena', iconKey: 'cayenne' },

  // Carnes y pescados
  { name: 'carne molida', iconKey: 'meat' },
  { name: 'bistec', iconKey: 'steak' },
  { name: 'asado', iconKey: 'asado' },
  { name: 'pollo', iconKey: 'chicken' },
  { name: 'pechuga', iconKey: 'chicken' },
  { name: 'nuggets', iconKey: 'nuggets' },
  { name: 'pescado', iconKey: 'fish' },
  { name: 'atun', iconKey: 'fish' },
  { name: 'jamón', iconKey: 'ham' },
  { name: 'hamburguesa', iconKey: 'pattyRaw' },
  { name: 'medallon', iconKey: 'pattyRaw' },
  { name: 'vienesa', iconKey: 'sausage' },

  // Lácteos y huevos
  { name: 'leche', iconKey: 'milk' },
  { name: 'yogur', iconKey: 'milk' },
  { name: 'yogurt', iconKey: 'milk' },
  { name: 'queso', iconKey: 'cheese' },
  { name: 'mantequilla', iconKey: 'butter' },
  { name: 'crema', iconKey: 'butter' },
  { name: 'huevo', iconKey: 'egg' },

  // Panadería
  { name: 'pan', iconKey: 'bread' },
  { name: 'tostadas', iconKey: 'bread' },
  { name: 'galleta', iconKey: 'cookie' },
  { name: 'torta', iconKey: 'cake' },

  // Almacén
  { name: 'arroz', iconKey: 'rice' },
  { name: 'fideos', iconKey: 'pasta' },
  { name: 'pasta', iconKey: 'pasta' },
  { name: 'harina', iconKey: 'flour' },
  { name: 'azúcar', iconKey: 'sugarSalt' },
  { name: 'sal', iconKey: 'sugarSalt' },
  { name: 'mayonesa', iconKey: 'condiment' },
  { name: 'ketchup', iconKey: 'condiment' },
  { name: 'aceite', iconKey: 'oil' },

  // Bebidas
  { name: 'café', iconKey: 'coffee' },
  { name: 'té', iconKey: 'tea' },
  { name: 'mate', iconKey: 'mate' },
  { name: 'yerba', iconKey: 'mate' },
  { name: 'agua', iconKey: 'water' },
  { name: 'bebida', iconKey: 'soda' },
  { name: 'jugo', iconKey: 'juice' },
  { name: 'cerveza', iconKey: 'beer' },
  { name: 'vino', iconKey: 'wine' },

  // Dulces y congelados
  { name: 'chocolate', iconKey: 'chocolate' },
  { name: 'helado', iconKey: 'iceCream' },
  { name: 'hielo', iconKey: 'ice' },

  // Limpieza e higiene
  { name: 'detergente', iconKey: 'cleaning' },
  { name: 'cloro', iconKey: 'bleach' },
  { name: 'jabón', iconKey: 'soap' },
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
  return catalog.get(normalizeProductName(name))
}
