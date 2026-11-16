// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinishPurchaseSheet } from '../../components/FinishPurchaseSheet'
import { History } from '../../components/History'
import { BudgetSheet } from '../../components/BudgetSheet'
import { EditItemSheet } from '../../components/ItemSheet'
import { previewPurchase } from '../purchases'
import { setCurrency } from '../prefs'
import type { ShoppingList } from '../../types'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
async function mount(element: React.ReactNode) { const host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); await act(async () => root!.render(element)); return host }
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.innerHTML = ''; setCurrency('CLP') })
const list: ShoppingList = { id: 'l', name: 'Compra', createdAt: 1, isTemplate: false, currency: 'CLP', budget: 5000, budgetCurrency: 'CLP', items: [
  { id: 'i', name: 'Pan', price: 3000, done: true, createdAt: 1, position: 0 },
  { id: 'j', name: 'Avena', done: true, createdAt: 1, position: 1 },
  { id: 'k', name: 'Leche', done: false, createdAt: 1, position: 2 },
] }
const submit = async () => act(async () => { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
describe('historial y moneda en pantalla', () => {
  it('exige confirmar moneda antigua y total parcial, y advierte sobre productos no comprados', async () => {
    const finish = vi.fn()
    await mount(<FinishPurchaseSheet list={{ ...list, currency: undefined }} onFinish={finish} onClose={vi.fn()} />)
    expect(document.body.textContent).toContain('no comprado')
    await submit(); expect(finish).not.toHaveBeenCalled()
    const boxes = document.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
    await act(async () => boxes[0].click())
    await submit(); expect(finish).not.toHaveBeenCalled()
    await act(async () => boxes[1].click())
    await submit(); expect(finish).toHaveBeenCalledWith('CLP')
  })
  it('impide finalizar si no hay ningún producto comprado', async () => {
    const finish = vi.fn()
    await mount(<FinishPurchaseSheet list={{ ...list, items: list.items.map((item) => ({ ...item, done: false })) }} onFinish={finish} onClose={vi.fn()} />)
    await submit(); expect(finish).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Marca al menos')
  })
  it('mantiene el presupuesto en CLP al cambiar la preferencia global a USD', async () => {
    setCurrency('USD'); const save = vi.fn()
    await mount(<BudgetSheet list={list} onSave={save} onClose={vi.fn()} />)
    expect(document.body.textContent).toContain('Presupuesto (CLP)')
    await submit(); expect(save).toHaveBeenCalledWith(5000, 'CLP')
  })
  it('edita un precio según la moneda de la lista y conserva el importe', async () => {
    setCurrency('USD'); const save = vi.fn()
    await mount(<EditItemSheet currency="CLP" item={list.items[0]} categories={[]} productCatalog={new Map()} onSave={save} onDelete={vi.fn()} onUploadImage={vi.fn()} onRemoveImage={vi.fn()} onChooseIcon={vi.fn()} onClose={vi.fn()} />)
    expect(document.body.textContent).toContain('(CLP)')
    await submit(); expect(save).toHaveBeenCalledWith(expect.objectContaining({ price: 3000 }))
  })
  it('muestra la moneda guardada y bloquea repetir una compra sin sincronizar', async () => {
    setCurrency('USD'); const repeat = vi.fn()
    const purchase = previewPurchase(list, 'CLP', [], new Map(), 'p')
    const host = await mount(<History purchases={[purchase]} loading={false} onRepeat={repeat} />)
    expect(host.textContent).toContain('CLP'); expect(host.textContent).not.toContain('USD')
    await act(async () => host.querySelector('button')!.click())
    const button = [...document.querySelectorAll('button')].find((entry) => entry.textContent?.includes('Repetir compra'))!
    expect(button.disabled).toBe(true)
    await act(async () => button.click()); expect(repeat).not.toHaveBeenCalled()
  })
})
