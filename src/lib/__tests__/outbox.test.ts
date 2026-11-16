// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Result = { error: { message: string } | null; status: number; count?: number }
const results: Result[] = []
const calls: string[] = []

function nextResult(call: string): Promise<Result> {
  calls.push(call)
  return Promise.resolve(results.shift() ?? { error: null, status: 200 })
}

vi.mock('../supabaseClient', () => ({
  supabase: {
    rpc: (fn: string) => nextResult(`rpc ${fn}`),
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
  it('finaliza tras enviar los cambios y notifica una recarga sin Realtime', async () => {
    outbox.setOutboxUser('u1')
    const refresh = vi.fn(); const unsubscribe = outbox.onOutboxRecovery(refresh)
    outbox.enqueue('marcar', { kind: 'update', table: 'items', values: { done: true }, match: { id: 'i1' } })
    outbox.enqueue('finalizar', { kind: 'rpc', fn: 'finish_purchase', args: { p_list_id: 'l1', p_purchase_id: 'p1' } })
    expect(outbox.isFinishQueued('l1')).toBe(true)
    await outbox.whenOutboxIdle()
    expect(calls).toEqual(['update items', 'rpc finish_purchase'])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(outbox.isFinishQueued('l1')).toBe(false); unsubscribe()
  })
  it('conserva el cierre para revisar si hubo un rechazo previo', async () => {
    results.push({ error: { message: 'rechazado' }, status: 403 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('marcar', { kind: 'update', table: 'items', values: { done: true }, match: { id: 'i1' } })
    outbox.enqueue('finalizar', { kind: 'rpc', fn: 'finish_purchase', args: { p_list_id: 'l1', p_purchase_id: 'p1' } })
    await outbox.whenOutboxIdle()
    expect(calls).toEqual(['update items'])
    expect(outbox.getFailedCount()).toBe(2)
    expect(outbox.getFailedChanges()[1].op).toMatchObject({ kind: 'rpc', args: { p_purchase_id: 'p1' } })
  })
  it('conserva una edición cuyo registro ya no existe, sin confundirla con un guardado exitoso', async () => {
    results.push({ error: null, status: 200, count: 0 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('editar Pan', { kind: 'update', table: 'items', values: { name: 'Pan' }, match: { id: 'missing' } })
    await outbox.whenOutboxIdle()
    expect(outbox.getFailedChanges()[0]).toMatchObject({ failure: { status: 409 } })
  })
  it('acepta acciones idempotentes en grupo aunque ya no queden filas que actualizar', async () => {
    results.push({ error: null, status: 200, count: 0 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('desmarcar todos', { kind: 'update', table: 'items', values: { done: false }, match: { list_id: 'list', done: true } })
    await outbox.whenOutboxIdle()
    expect(outbox.getFailedCount()).toBe(0)
  })
  it('avisa si el navegador no puede persistir cambios y conserva la cola en memoria', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    outbox.setOutboxUser('u1')
    const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    expect(outbox.getPendingCount()).toBe(1)
    expect(outbox.getSyncIssue()).toContain('Mantén la app abierta')
    expect(outbox.saveOutbox()).toBe(false)
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

  it('separa un cambio rechazado, lo conserva para revisar y sigue con el resto', async () => {
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
    expect(outbox.getFailedCount()).toBe(1)
    expect(outbox.getFailedChanges()[0]).toMatchObject({ label: 'agregar el ítem', failure: { status: 403 } })
    expect(JSON.parse(localStorage.getItem('listiapp-outbox:u1')!)).toHaveLength(1)
  })

  it('recupera rechazos al volver a la misma cuenta sin reenviarlos automáticamente', async () => {
    results.push({ error: { message: 'dato inválido' }, status: 400 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('crear lista', { kind: 'upsert', table: 'lists', values: { id: 'list', name: 'Compra' } })
    await outbox.whenOutboxIdle()
    const id = outbox.getFailedChanges()[0].id
    expect(outbox.saveOutbox()).toBe(true)
    outbox.setOutboxUser(null)
    outbox.setOutboxUser('u2')
    expect(outbox.getFailedCount()).toBe(0)
    outbox.setOutboxUser('u1')
    expect(outbox.getFailedChanges()[0].id).toBe(id)
    expect(calls).toHaveLength(1)
    const recovered = vi.fn()
    const stop = outbox.onOutboxRecovery(recovered)
    outbox.retryFailedChanges([id])
    await outbox.whenOutboxIdle()
    stop()
    expect(calls).toHaveLength(2)
    expect(outbox.getFailedCount()).toBe(0)
    expect(recovered).toHaveBeenCalledTimes(1)
  })

  it('solo descarta rechazos, nunca borra un cambio que ya está en reintento', async () => {
    results.push({ error: { message: 'rechazado' }, status: 403 })
    outbox.setOutboxUser('u1')
    outbox.enqueue('crear', { kind: 'upsert', table: 'lists', values: { id: '1' } })
    await outbox.whenOutboxIdle()
    const id = outbox.getFailedChanges()[0].id
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    outbox.retryFailedChanges([id])
    outbox.discardFailedChange(id)
    expect(outbox.getPendingCount()).toBe(1)
    expect(JSON.parse(localStorage.getItem('listiapp-outbox:u1')!)).toHaveLength(1)
  })

  it('lee las colas guardadas por versiones anteriores sin identificadores', async () => {
    localStorage.setItem('listiapp-outbox:u1', JSON.stringify([{ label: 'anterior', attempts: 0,
      op: { kind: 'upsert', table: 'lists', values: { id: 'old' } } }]))
    outbox.setOutboxUser('u1')
    await outbox.whenOutboxIdle()
    expect(calls).toEqual(['upsert lists'])
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
