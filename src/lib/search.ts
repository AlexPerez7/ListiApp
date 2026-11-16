import { normalizeProductName, productSearchVariants } from './productCatalog'

function containsWords(name: string, query: string): boolean {
  return query.split(' ').every((word) => name.includes(word))
}

export function matchesTextSearch(name: string, query: string): boolean {
  return containsWords(normalizeProductName(name), normalizeProductName(query))
}

export function matchesProductSearch(name: string, query: string): boolean {
  const names = productSearchVariants(name)
  return productSearchVariants(query).some((candidate) => names.some((name) => containsWords(name, candidate)))
}
