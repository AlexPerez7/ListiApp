import { describe, expect, it, vi } from 'vitest'
import { readAllPages } from '../pagination'

describe('lectura completa de datos', () => {
  it('incluye registros más allá de los límites anteriores y la última página', async () => {
    const source = Array.from({ length: 1201 }, (_, id) => ({ id }))
    const read = vi.fn(async (from: number, to: number) => ({ data: source.slice(from, to + 1), error: null }))
    expect(await readAllPages(read)).toEqual(source)
    expect(read.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]])
  })
  it('no presenta un resultado parcial como una lectura completa', async () => {
    await expect(readAllPages(async (from) => from === 0
      ? { data: [{ id: 1 }, { id: 2 }], error: null }
      : { data: null, error: { message: 'servidor no disponible' } }, 2)).rejects.toThrow('servidor no disponible')
  })
})
