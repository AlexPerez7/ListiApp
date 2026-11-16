// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { error: { message: string } | null; status: number }
const results: Result[] = []
const calls: string[] = []

function nextResult(call: string): Promise<Result> {
  calls.push(call)
  return Promise.resolve(results.shift() ?? { error: null, status: 200 })
}

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: () => nextResult(`upsert ${table}`),
      update: () => {
        const query = { eq: () => query, then: (resolve: (r: Result) => void) => nextResult(`update ${table}`).then(resolve) }
        return query
      },
      delete: () => {
        const query = { eq: () => query, then: (resolve: (r: Result) => void) => nextResult(`delete ${table}`).then(resolve) }
        return query
      },
    }),
  },
}))

const outbox = await import('../outbox')

beforeEach(() => {
  outbox.setOutboxUser(null)
  localStorage.clear()
  results.length = 0
  calls.length = 0
})

afterEach(() => {
  outbox.setOutboxUser(null)
  vi.restoreAllMocks()
})

describe('cola de cambios', () => {
  it('avisa si el navegador no puede persistir cambios y conserva la cola en memoria', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    outbox.setOutboxUser('u1')
    const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    expect(outbox.getPendingCount()).toBe(1)
    expect(outbox.getSyncIssue()).toContain('Mantén la app abierta')
    storage.mockRestore()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    await outbox.flush()
    expect(outbox.getPendingCount()).toBe(0)
    expect(outbox.getSyncIssue()).toBeNull()
  })
  it.each([401, 408, 429, 500, 503])('conserva cambios tras más de cuatro errores HTTP %s y luego recupera', async (status) => {
    results.push(...Array.from({ length: 6 }, () => ({ error: { message: 'temporal' }, status })))
    outbox.setOutboxUser('u1')
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    await vi.waitFor(() => expect(outbox.getSyncIssue()).not.toBeNull())
    for (let i = 0; i < 5; i++) await outbox.flush()
    expect(outbox.getPendingCount()).toBe(1)
    expect(JSON.parse(localStorage.getItem('listiapp-outbox:u1')!)).toHaveLength(1)
    expect(outbox.getSyncIssue()).not.toBeNull()
    await outbox.flush()
    expect(outbox.getPendingCount()).toBe(0)
    expect(outbox.getSyncIssue()).toBeNull()
    expect(calls).toHaveLength(7)
  })
  it('envía los cambios en orden y queda vacía', async () => {
    outbox.setOutboxUser('u1')
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    outbox.enqueue('editar', { kind: 'update', table: 'items', values: { done: true }, match: { id: '2' } })
    outbox.enqueue('borrar', { kind: 'delete', table: 'items', match: { id: '3' } })
    await outbox.whenOutboxIdle()
    expect(calls).toEqual(['upsert lists', 'update items', 'delete items'])
    expect(outbox.getPendingCount()).toBe(0)
  })

  it('conserva los cambios si falla la red y los recupera al reabrir', async () => {
    results.push({ error: { message: 'TypeError: Failed to fetch' }, status: 0 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    expect(outbox.getPendingCount()).toBe(1)

    // Simula cerrar y volver a abrir la app: la cola se lee de localStorage.
    outbox.setOutboxUser(null)
    outbox.setOutboxUser('u1')
    await outbox.whenOutboxIdle()
    expect(calls).toEqual(['upsert lists', 'upsert lists'])
  })

  it('descarta un cambio rechazado por el servidor, avisa y sigue con el resto', async () => {
    const errors: string[] = []
    const stop = outbox.onOutboxError((label) => errors.push(label))
    results.push({ error: { message: 'violates row-level security' }, status: 403 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('agregar el ítem', { kind: 'upsert', table: 'items', values: { id: '1' } })
    outbox.enqueue('editar el ítem', { kind: 'update', table: 'items', values: {}, match: { id: '2' } })
    await outbox.whenOutboxIdle()
    stop()
    expect(errors).toEqual(['agregar el ítem'])
    expect(calls).toEqual(['upsert items', 'update items'])
  })

  it('no mezcla los cambios de usuarios distintos', async () => {
    results.push({ error: { message: 'Failed to fetch' }, status: 0 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    outbox.setOutboxUser('u2')
    expect(outbox.getPendingCount()).toBe(0)
  })
})
