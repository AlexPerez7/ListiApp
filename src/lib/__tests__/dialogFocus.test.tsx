// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDialogFocus } from '../../hooks/useDialogFocus'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let host: HTMLDivElement
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.innerHTML = '' })
function Dialog({ close }: { close: () => void }) {
  const ref = useDialogFocus(true, close)
  return <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}><button>Primero</button><button>Último</button></div>
}
describe('foco en modales', () => {
  it('contiene Tab y Shift+Tab, permite Escape y restaura el foco al cerrar', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    const close = vi.fn()
    await act(async () => root!.render(<Dialog close={close} />))
    const buttons = host.querySelectorAll('button')
    expect(document.activeElement).toBe(buttons[0])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(buttons[1])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(buttons[0])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(close).toHaveBeenCalledTimes(1)
    await act(async () => root!.unmount()); root = undefined
    expect(document.activeElement).toBe(opener)
  })
})
