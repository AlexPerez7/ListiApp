// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  change: undefined as ((event: string, next: Session | null) => void) | undefined,
}))
vi.mock('../supabaseClient', () => ({ isSupabaseConfigured: true, supabase: { auth: {
  getSession: async () => ({ data: { session: null } }),
  onAuthStateChange: (callback: typeof auth.change) => {
    auth.change = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  },
} } }))
vi.mock('../outbox', () => ({ setOutboxUser: vi.fn() }))
vi.mock('../../Workspace', () => ({ default: ({ user }: { user: { id: string } }) => <div>Cuenta: {user.id}</div> }))
vi.mock('../../components/Auth', () => ({ Auth: () => <div>Iniciar sesión</div> }))
vi.mock('../../components/ResetPassword', () => ({ ResetPassword: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>Terminar recuperación</button> }))

const { default: App } = await import('../../App')
const { setOutboxUser } = await import('../outbox')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let host: HTMLDivElement
async function settle() { await act(async () => vi.dynamicImportSettled()) }
async function mount() {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => root!.render(<App />)); await settle()
}
function session(id: string): Session { return { user: { id } } as Session }
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined; document.body.innerHTML = ''; vi.clearAllMocks()
})

describe('pantallas bajo demanda', () => {
  it('muestra acceso sin sesión y cambia de cuenta sin dejar visible el espacio anterior', async () => {
    await mount()
    expect(host.textContent).toContain('Iniciar sesión')
    await act(async () => auth.change!('SIGNED_IN', session('u1'))); await settle()
    expect(host.textContent).toContain('Cuenta: u1')
    await act(async () => auth.change!('SIGNED_IN', session('u2'))); await settle()
    expect(host.textContent).toContain('Cuenta: u2')
    expect(host.textContent).not.toContain('Cuenta: u1')
    expect(setOutboxUser).toHaveBeenLastCalledWith('u2')
    await act(async () => auth.change!('SIGNED_OUT', null)); await settle()
    expect(host.textContent).toContain('Iniciar sesión')
    expect(host.textContent).not.toContain('Cuenta:')
  })
  it('abre la recuperación de contraseña y vuelve al espacio de la cuenta', async () => {
    await mount()
    await act(async () => auth.change!('PASSWORD_RECOVERY', session('u1'))); await settle()
    expect(host.textContent).toContain('Terminar recuperación')
    await act(async () => host.querySelector('button')!.click()); await settle()
    expect(host.textContent).toContain('Cuenta: u1')
  })
})
