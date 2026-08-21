// Catálogo de productos comunes de supermercado, mapeados a la clave de una
// ilustración simple (ver components/ProductIcon.tsx), para mostrar una
// miniatura aunque el usuario no haya subido su propia foto. Si el usuario
// sube una foto real, esta siempre tiene prioridad (ver ItemRow en
// ListDetail.tsx).
const CATALOG: Record<string, string> = {
  // Frutas
  manzana: 'apple',
  naranja: 'citrus',
  mandarina: 'citrus',
  limon: 'citrus',
  banana: 'banana',
  banano: 'banana',
  pera: 'pear',
  uva: 'grapes',
  uvas: 'grapes',
  sandia: 'watermelon',
  frutilla: 'strawberry',
  frutillas: 'strawberry',
  ananá: 'pineapple',
  ananas: 'pineapple',
  palta: 'avocado',
  aguacate: 'avocado',

  // Verduras
  tomate: 'tomato',
  papa: 'potato',
  papas: 'potato',
  cebolla: 'onion',
  zanahoria: 'carrot',
  lechuga: 'leafy',
  brocoli: 'leafy',
  pepino: 'cucumber',
  zapallito: 'cucumber',
  zapallo: 'cucumber',
  maiz: 'corn',
  choclo: 'corn',
  ajo: 'garlic',
  pimiento: 'pepper',
  morron: 'pepper',

  // Carnes y pescados
  'carne molida': 'meat',
  'carne picada': 'meat',
  bife: 'meat',
  asado: 'meat',
  milanesa: 'meat',
  milanesas: 'meat',
  pollo: 'chicken',
  pechuga: 'chicken',
  nuggets: 'chicken',
  pescado: 'fish',
  atun: 'fish',
  jamon: 'ham',
  jamón: 'ham',
  hamburguesa: 'burger',
  hamburguesas: 'burger',
  salchicha: 'sausage',
  salchichas: 'sausage',

  // Lácteos y huevos
  leche: 'milk',
  yogur: 'milk',
  yogurt: 'milk',
  queso: 'cheese',
  manteca: 'butter',
  mantequilla: 'butter',
  crema: 'butter',
  huevo: 'egg',
  huevos: 'egg',

  // Panadería
  pan: 'bread',
  tostadas: 'bread',
  facturas: 'pastry',
  medialunas: 'pastry',
  galletitas: 'cookie',
  galletas: 'cookie',
  torta: 'cake',

  // Almacén
  arroz: 'rice',
  fideos: 'pasta',
  pasta: 'pasta',
  harina: 'flour',
  azucar: 'sugarSalt',
  azúcar: 'sugarSalt',
  sal: 'sugarSalt',
  mayonesa: 'condiment',
  ketchup: 'condiment',
  aceite: 'oil',

  // Bebidas
  cafe: 'coffee',
  café: 'coffee',
  te: 'tea',
  té: 'tea',
  mate: 'mate',
  yerba: 'mate',
  agua: 'water',
  gaseosa: 'soda',
  jugo: 'juice',
  cerveza: 'beer',
  vino: 'wine',

  // Dulces y congelados
  chocolate: 'chocolate',
  helado: 'iceCream',
  hielo: 'ice',

  // Limpieza e higiene
  detergente: 'cleaning',
  lavandina: 'cleaning',
  jabon: 'cleaning',
  jabón: 'cleaning',
  shampoo: 'shampoo',
  champu: 'shampoo',
  champú: 'shampoo',
  papel: 'paper',
  'papel higienico': 'paper',
  'papel higiénico': 'paper',
  pañales: 'diaper',
  panales: 'diaper',
}

export function normalizeProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export function getCatalogIcon(name: string): string | undefined {
  return CATALOG[normalizeProductName(name)]
}

export const PRODUCT_ICON_KEYS = [...new Set(Object.values(CATALOG))].sort()
