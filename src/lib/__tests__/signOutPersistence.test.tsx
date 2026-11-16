// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ signOut: vi.fn(async () => ({ error: null })) }))
vi.mock('../supabaseClient', () => ({ supabase: { auth } }))
vi.mock('../confirm', () => ({ confirmDialog: vi.fn(async () => true) }))
vi.mock('../appUpdate', () => ({ useUpdateStatus: () => 'idle', installUpdate: vi.fn() }))
vi.mock('../../hooks/useShoppingLists', () => ({ useShoppingLists: () => ({ lists: [], loading: false }), fetchLists: vi.fn() }))
vi.mock('../../hooks/useCategories', () => ({ useCategories: () => ({ categories: [], loading: false }), fetchCategories: vi.fn() }))
vi.mock('../../hooks/useProductCatalog', () => ({ useProductCatalog: () => ({ catalog: [], loading: false }), fetchCatalog: vi.fn() }))
vi.mock('../../hooks/useRoute', () => ({ useRoute: () => ({ route: { tab: 'settings', listId: null }, setTab: vi.fn() }) }))
vi.mock('../../components/Settings', () => ({ Settings: ({ onSignOut }: { onSignOut: () => void }) => <button onClick={onSignOut}>Salir</button> }))
vi.mock('../../hooks/usePurchaseHistory', () => ({ usePurchaseHistory: () => ({ purchases: [], loading: false }), fetchPurchaseHistory: vi.fn() }))
const outbox = await import('../outbox')
const { writeCache, readCache } = await import('../cache')
const { default: Workspace } = await import('../../Workspace')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
beforeEach(() => {
  localStorage.clear(); outbox.setOutboxUser('u1'); auth.signOut.mockClear()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  writeCache('u1', 'lists', [{ id: 'l1', name: 'Mi compra' }])
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined; outbox.setOutboxUser(null); document.body.innerHTML = ''; localStorage.clear(); vi.restoreAllMocks()
})
async function leave() {
  const host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => root!.render(<Workspace user={{ id: 'u1' } as User} />))
  await act(async () => vi.dynamicImportSettled())
  await act(async () => [...host.querySelectorAll('button')].find((button) => button.textContent === 'Salir')!.click())
}
describe('cerrar sesión con cambios locales', () => {
  it('conserva la cola y la copia local para recuperar cambios al volver a la cuenta', async () => {
    outbox.enqueue('crear lista', { kind: 'upsert', table: 'lists', values: { id: 'l1', name: 'Mi compra' } })
    await leave()
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('listiapp-outbox:u1')!)).toHaveLength(1)
    expect(readCache('u1', 'lists')).toEqual([{ id: 'l1', name: 'Mi compra' }])
  })
  it('impide salir si la copia persistente no puede guardarse', async () => {
    outbox.enqueue('crear lista', { kind: 'upsert', table: 'lists', values: { id: 'l1' } })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    await leave()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(outbox.getPendingCount()).toBe(1)
  })
  it('limpia la caché al salir cuando todos los cambios están guardados', async () => {
    await leave()
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(readCache('u1', 'lists')).toBeNull()
  })
})
