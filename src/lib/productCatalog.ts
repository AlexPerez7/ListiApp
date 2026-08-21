// Catálogo de productos comunes de supermercado con un emoji genérico, para
// mostrar una miniatura aunque el usuario no haya subido su propia foto. Si
// el usuario sube una foto real, esta siempre tiene prioridad (ver
// getItemThumbnail en ListDetail.tsx).
const CATALOG: Record<string, string> = {
  // Frutas y verduras
  manzana: '🍎',
  banana: '🍌',
  banano: '🍌',
  naranja: '🍊',
  mandarina: '🍊',
  limon: '🍋',
  pera: '🍐',
  uva: '🍇',
  uvas: '🍇',
  sandia: '🍉',
  frutilla: '🍓',
  frutillas: '🍓',
  ananá: '🍍',
  ananas: '🍍',
  palta: '🥑',
  aguacate: '🥑',
  tomate: '🍅',
  papa: '🥔',
  papas: '🥔',
  cebolla: '🧅',
  zanahoria: '🥕',
  lechuga: '🥬',
  pepino: '🥒',
  zapallo: '🎃',
  zapallito: '🥒',
  maiz: '🌽',
  choclo: '🌽',
  ajo: '🧄',
  brocoli: '🥦',
  pimiento: '🫑',
  morron: '🫑',

  // Carnes y pescados
  'carne molida': '🥩',
  'carne picada': '🥩',
  bife: '🥩',
  asado: '🥩',
  milanesa: '🍖',
  milanesas: '🍖',
  pollo: '🍗',
  pechuga: '🍗',
  hamburguesa: '🍔',
  hamburguesas: '🍔',
  salchicha: '🌭',
  salchichas: '🌭',
  nuggets: '🍗',
  pescado: '🐟',
  atun: '🐟',
  jamon: '🍖',
  jamón: '🍖',

  // Lácteos y huevos
  leche: '🥛',
  yogur: '🥛',
  yogurt: '🥛',
  queso: '🧀',
  manteca: '🧈',
  mantequilla: '🧈',
  crema: '🧈',
  huevo: '🥚',
  huevos: '🥚',

  // Panadería
  pan: '🍞',
  facturas: '🥐',
  medialunas: '🥐',
  tostadas: '🍞',
  galletitas: '🍪',
  galletas: '🍪',
  torta: '🍰',

  // Almacén y bebidas
  arroz: '🍚',
  fideos: '🍝',
  pasta: '🍝',
  harina: '🌾',
  azucar: '🧂',
  azúcar: '🧂',
  sal: '🧂',
  aceite: '🫙',
  mayonesa: '🫙',
  ketchup: '🫙',
  cafe: '☕',
  café: '☕',
  te: '🍵',
  té: '🍵',
  mate: '🧉',
  yerba: '🧉',
  agua: '💧',
  gaseosa: '🥤',
  jugo: '🧃',
  cerveza: '🍺',
  vino: '🍷',
  chocolate: '🍫',
  helado: '🍨',

  // Congelados
  hielo: '🧊',

  // Limpieza e higiene
  detergente: '🧽',
  lavandina: '🧽',
  jabon: '🧼',
  jabón: '🧼',
  shampoo: '🧴',
  champu: '🧴',
  champú: '🧴',
  papel: '🧻',
  'papel higienico': '🧻',
  'papel higiénico': '🧻',
  pañales: '🧷',
  panales: '🧷',
}

export function normalizeProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export function getCatalogEmoji(name: string): string | undefined {
  return CATALOG[normalizeProductName(name)]
}
