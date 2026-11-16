// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddItemSheet, EditItemSheet } from '../../components/ItemSheet'
import { BudgetSheet } from '../../components/BudgetSheet'
import { setCurrency } from '../prefs'
import { dismissToast, getToast } from '../toast'
import { ToastHost } from '../../components/Overlays'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; dismissToast(); document.body.innerHTML = '' })
async function mount(element: React.ReactNode) {
  const host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => root!.render(element))
}
describe('formularios de compra', () => {
  it.each([false, true])('seleccionar una sugerencia espera a Agregar antes de guardar (comprado: %s)', async (alreadyBought) => {
    const add = vi.fn(), toggle = vi.fn()
    const categories = [
      { id: 'c1', name: 'Habitual', icon: '🍞', position: 0 },
      { id: 'c2', name: 'Elegida', icon: '🛒', position: 1 },
    ]
    await mount(<><ToastHost aboveTabs={false} /><AddItemSheet currency="CLP"
      items={alreadyBought ? [{ id: 'i1', name: 'Pan', done: true, position: 0, createdAt: 1 }] : []}
      categories={categories} itemMemory={{ names: ['Pan'], categoryByName: new Map([['pan', 'c1']]) }}
      productCatalog={new Map()} onAdd={add} onToggleItem={toggle} onClose={vi.fn()} /></>)
    const suggestion = [...document.querySelectorAll('button')].find((button) => button.className.includes('suggestion'))!
    await act(async () => suggestion.click())
    expect(document.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe('Pan')
    expect(add).not.toHaveBeenCalled()
    expect(toggle).not.toHaveBeenCalled()
    expect(getToast()).toBeNull()
    expect(document.querySelector('[role="radio"][aria-checked="true"]')!.textContent).toContain('Habitual')
    const category = [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((button) => button.textContent?.includes('Elegida'))!
    await act(async () => category.click())
    expect(add).not.toHaveBeenCalled()
    expect(toggle).not.toHaveBeenCalled()
    await act(async () => document.querySelector<HTMLButtonElement>('button[type="submit"]')!.click())
    if (alreadyBought) {
      expect(toggle).toHaveBeenCalledWith('i1')
      expect(add).not.toHaveBeenCalled()
      expect(getToast()).toMatchObject({ kind: 'success', message: '«Pan» volvió a pendientes', placement: 'top' })
    } else {
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pan', categoryId: 'c2', quantityValue: 1 }))
      expect(getToast()).toMatchObject({ kind: 'success', message: 'Producto agregado: Pan', placement: 'top' })
      expect([...document.querySelectorAll('[role="status"]')].some((node) => node.textContent === 'Producto agregado: Pan')).toBe(true)
    }
  })
  it.each([3000, undefined])('editar un ítem antiguo conserva su precio total (%s) y cantidad de texto', async (price) => {
    setCurrency('CLP')
    const save = vi.fn()
    await mount(<EditItemSheet item={{ id: 'i', name: 'Pan', quantity: '2 bolsas', price, done: false, position: 0, createdAt: 1 }}
      categories={[]} productCatalog={new Map()} onSave={save} onDelete={vi.fn()} onUploadImage={vi.fn()}
      onRemoveImage={vi.fn()} onChooseIcon={vi.fn()} onClose={vi.fn()} />)
    expect(document.body.textContent).toContain('Cantidad guardada: 2 bolsas')
    await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pan', quantity: '2 bolsas', price, unitPrice: undefined, quantityValue: undefined }))
  })
  it('conserva un presupuesto de cero al abrir y guardar', async () => {
    setCurrency('CLP')
    const save = vi.fn()
    await mount(<BudgetSheet list={{ id: 'l', name: 'Lista', items: [], createdAt: 1, isTemplate: false, budget: 0, budgetCurrency: 'CLP' }} onSave={save} onClose={vi.fn()} />)
    expect(document.querySelector('input')!.value).toBe('0')
    await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(save).toHaveBeenCalledWith(0, 'CLP')
  })
})
