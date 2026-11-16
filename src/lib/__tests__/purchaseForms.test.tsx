// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditItemSheet } from '../../components/ItemSheet'
import { BudgetSheet } from '../../components/BudgetSheet'
import { setCurrency } from '../prefs'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.innerHTML = '' })
async function mount(element: React.ReactNode) {
  const host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => root!.render(element))
}
describe('formularios de compra', () => {
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
