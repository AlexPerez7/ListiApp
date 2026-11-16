import { describe, expect, it } from 'vitest'
import { matchesProductSearch, matchesTextSearch } from '../search'
import { matchSuggestions } from '../itemSuggestions'

describe('búsquedas', () => {
  it('ignora acentos, mayúsculas, espacios repetidos y orden de palabras', () => {
    expect(matchesTextSearch('Súper de la semana', 'SEMANA   super')).toBe(true)
    expect(matchesProductSearch('Pasta de maní natural', 'natural mani')).toBe(true)
    expect(matchesProductSearch('Café molido', 'cafe')).toBe(true)
    expect(matchesTextSearch('Feria', 'farmacia')).toBe(false)
  })
  it('encuentra sinónimos conocidos y sus variantes con descripciones', () => {
    expect(matchesProductSearch('Plátano', 'banana')).toBe(true)
    expect(matchesProductSearch('Banana madura', 'platano')).toBe(true)
    expect(matchesProductSearch('Pasta de maní', 'mantequilla de mani')).toBe(true)
    expect(matchesProductSearch('Pasta de maní natural', 'crema natural')).toBe(true)
    expect(matchesProductSearch('Mantequilla', 'mani')).toBe(false)
  })
  it('las sugerencias encuentran palabras interiores, conservan acentos y no repiten sinónimos', () => {
    expect(matchSuggestions([], ['pasta de maní', 'manzana'], 'mani', new Set())).toEqual(['Pasta de maní'])
    expect(matchSuggestions(['Banana'], ['plátano'], 'ban', new Set())).toEqual(['Banana'])
    expect(matchSuggestions([], ['plátano'], 'banana', new Set())).toEqual(['Plátano'])
    expect(matchSuggestions([], ['plátano'], 'banana', new Set(['banano']))).toEqual([])
    expect(matchSuggestions(['Café'], ['café'], '', new Set())).toEqual(['Café'])
  })
})
