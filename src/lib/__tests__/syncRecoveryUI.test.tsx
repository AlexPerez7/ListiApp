// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const backend = vi.hoisted(() => ({ calls: 0 }))
vi.mock('../supabaseClient', () => ({ supabase: { from: () => ({ upsert: async () => {
  backend.calls++
  return backend.calls === 1 ? { error: { message: 'rechazado' }, status: 403 } : { error: null, status: 200 }
} }) } }))
vi.mock('../confirm', () => ({ confirmDialog: vi.fn(async () => false) }))
const { confirmDialog } = await import('../confirm')
const outbox = await import('../outbox')
const { SyncRecoverySheet } = await import('../../components/SyncRecoverySheet')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
beforeEach(async () => {
  localStorage.clear(); backend.calls = 0; outbox.setOutboxUser('u1')
  outbox.enqueue('agregar el producto', { kind: 'upsert', table: 'product_catalog', values: { name: 'Avena' } })
  await outbox.whenOutboxIdle()
  const host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => root!.render(<SyncRecoverySheet onClose={vi.fn()} />))
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined; outbox.setOutboxUser(null); localStorage.clear(); document.body.innerHTML = ''; vi.clearAllMocks()
})
const button = (name: string) => [...document.querySelectorAll('button')].find((entry) => entry.textContent === name)!
describe('revisión de cambios rechazados', () => {
  it('muestra el producto y solo descarta después de confirmar', async () => {
    expect(document.body.textContent).toContain('Avena')
    vi.mocked(confirmDialog).mockResolvedValueOnce(false)
    await act(async () => button('Descartar').click())
    expect(outbox.getFailedCount()).toBe(1)
    vi.mocked(confirmDialog).mockResolvedValueOnce(true)
    await act(async () => button('Descartar').click())
    expect(outbox.getFailedCount()).toBe(0)
    expect(backend.calls).toBe(1)
  })
  it('reintenta el cambio original después de confirmar y elimina el rechazo al guardarse', async () => {
    vi.mocked(confirmDialog).mockResolvedValueOnce(true)
    await act(async () => { button('Reintentar').click(); await Promise.resolve() })
    await act(async () => outbox.whenOutboxIdle())
    expect(backend.calls).toBe(2)
    expect(outbox.getFailedCount()).toBe(0)
    expect(document.body.textContent).toContain('No quedan cambios por revisar')
  })
  it('una confirmación pendiente de otra cuenta no reenvía datos tras cambiar de usuario', async () => {
    let resolve!: (value: boolean) => void
    vi.mocked(confirmDialog).mockImplementationOnce(() => new Promise<boolean>((done) => { resolve = done }))
    await act(async () => button('Reintentar').click())
    await act(async () => { outbox.setOutboxUser('u2'); resolve(true) })
    expect(backend.calls).toBe(1)
    expect(outbox.getOutboxUser()).toBe('u2')
    expect(outbox.getFailedCount()).toBe(0)
  })
})
