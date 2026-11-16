// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { formatPrice, parsePrice, pluralize, priceToInput } from '../format'

describe('parsePrice', () => {
  it('trata puntos y comas como miles en monedas sin decimales', () => {
    expect(parsePrice('1.490', 'CLP')).toBe(1490)
    expect(parsePrice('$ 12.990', 'CLP')).toBe(12990)
    expect(parsePrice('3290', 'CLP')).toBe(3290)
  })

  it('acepta coma o punto decimal en monedas con decimales', () => {
    expect(parsePrice('12,5', 'USD')).toBe(12.5)
    expect(parsePrice('12.50', 'USD')).toBe(12.5)
    expect(parsePrice('1.490,50', 'ARS')).toBe(1490.5)
    expect(parsePrice('1,490.50', 'USD')).toBe(1490.5)
    expect(parsePrice('1.490', 'ARS')).toBe(1490)
  })

  it('devuelve undefined si no hay un precio válido', () => {
    expect(parsePrice('', 'CLP')).toBeUndefined()
    expect(parsePrice('abc', 'USD')).toBeUndefined()
    expect(parsePrice('999999999999', 'CLP')).toBeUndefined()
  })
})

describe('formato', () => {
  it('formatea según la moneda', () => {
    expect(formatPrice(1490, 'CLP')).toBe('$1.490')
    expect(formatPrice(12.5, 'USD')).toBe('$12.50')
  })

  it('precarga el campo de precio al editar', () => {
    expect(priceToInput(1490, 'CLP')).toBe('1490')
    expect(priceToInput(12.5, 'USD')).toBe('12,5')
    expect(priceToInput(undefined, 'USD')).toBe('')
  })

  it('pluraliza', () => {
    expect(pluralize(1, 'ítem', 'ítems')).toBe('1 ítem')
    expect(pluralize(3, 'ítem', 'ítems')).toBe('3 ítems')
  })
})
