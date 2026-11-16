// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ rows: [] as { id: string; name: string }[], writes: 0,
  failNext: undefined as number | undefined, broadcast: true,
  listeners: new Set<(payload: unknown) => void>() }))
vi.mock('../supabaseClient', () => ({ supabase: {
  from: () => ({ upsert: async (row: { id: string; name: string }) => {
    if (db.failNext) {
      const status = db.failNext; db.failNext = undefined
      return { error: { message: 'rechazado' }, status }
    }
    db.writes++; db.rows = [...db.rows.filter((entry) => entry.id !== row.id), row]
    if (db.broadcast) for (const listener of db.listeners) listener({ eventType: 'INSERT', new: row })
    return { error: null, status: 200 }
  } }),
  channel: () => {
    let callback: ((payload: unknown) => void) | undefined
    const channel = {
      on: (_type: string, _filter: unknown, handler: (payload: unknown) => void) => {
        callback = handler; db.listeners.add(handler); return channel
      }, subscribe: () => channel, remove: () => { if (callback) db.listeners.delete(callback) },
    }; return channel
  },
  removeChannel: (channel: { remove: () => void }) => channel.remove(),
} }))
const outbox = await import('../outbox')
const { useSyncedCollection } = await import('../../hooks/useSyncedCollection')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let host: HTMLDivElement
function Screen() {
  const { data, setData } = useSyncedCollection({ userId: 'u1', name: 'lifecycle-test',
    fetchAll: async () => [...db.rows], realtime: [{ table: 'lists', apply: (previous, payload) => {
      const row = payload.new as { id: string; name: string }
      return [...previous.filter((entry) => entry.id !== row.id), row]
    } }] })
  const append = () => {
    const row = { id: 'l1', name: 'Compra sin conexión' }
    setData((previous) => [...previous, row])
    outbox.enqueue('crear lista', { kind: 'upsert', table: 'lists', values: row })
  }
  return <div><button onClick={append}>Agregar</button>{data.map((row) => row.name).join(',')}</div>
}
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined; outbox.setOutboxUser(null); localStorage.clear(); document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
  db.broadcast = true; db.failNext = undefined
})
describe('ciclo de sincronización', () => {
  it('recupera la vista tras reintentar un rechazo aunque no lleguen eventos Realtime', async () => {
    vi.useFakeTimers()
    db.rows = []; db.writes = 0; db.broadcast = false; localStorage.clear()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    outbox.setOutboxUser('u1')
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    await act(async () => root!.render(<Screen />))
    db.failNext = 403
    await act(async () => host.querySelector('button')!.click())
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(host.textContent).not.toContain('Compra sin conexión')
    expect(outbox.getFailedCount()).toBe(1)
    await act(async () => outbox.retryFailedChanges([outbox.getFailedChanges()[0].id]))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(host.textContent).toContain('Compra sin conexión')
    expect(outbox.getFailedCount()).toBe(0)
    expect(db.writes).toBe(1)
  })
  it('actualiza dos vistas del mismo usuario tras enviar y recibir el eco de Realtime', async () => {
    vi.useFakeTimers()
    db.rows = []; db.writes = 0; localStorage.clear()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    outbox.setOutboxUser('u1')
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    const otherHost = document.createElement('div'); document.body.appendChild(otherHost)
    const otherRoot = createRoot(otherHost)
    try {
      await act(async () => { root!.render(<Screen />); otherRoot.render(<Screen />) })
      await act(async () => host.querySelector('button')!.click())
      await act(async () => vi.advanceTimersByTimeAsync(500))
      expect(host.textContent).toContain('Compra sin conexión')
      expect(otherHost.textContent).toContain('Compra sin conexión')
      expect(db.writes).toBe(1)
      expect(outbox.getPendingCount()).toBe(0)
    } finally {
      await act(async () => otherRoot.unmount())
    }
  })
  it('conserva una lista offline al reabrir y la envía al reconectar', async () => {
    db.rows = []; db.writes = 0; localStorage.clear()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    outbox.setOutboxUser('u1')
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    await act(async () => root!.render(<Screen />))
    await act(async () => host.querySelector('button')!.click())
    expect(host.textContent).toContain('Compra sin conexión')
    expect(db.writes).toBe(0)
    await act(async () => root!.unmount()); root = undefined
    outbox.setOutboxUser(null); outbox.setOutboxUser('u1')
    root = createRoot(host)
    await act(async () => root!.render(<Screen />))
    expect(host.textContent).toContain('Compra sin conexión')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    await act(async () => { await outbox.flush() })
    expect(outbox.getPendingCount()).toBe(0)
    expect(db.rows).toEqual([{ id: 'l1', name: 'Compra sin conexión' }])
    expect(db.writes).toBe(1)
  })
})
