import { useState, type FormEvent } from 'react'
import type { ShoppingList } from '../types'
import { parsePrice, priceToInput } from '../lib/format'
import { usePrefs } from '../lib/prefs'
import { BottomSheet } from './BottomSheet'

export function BudgetSheet({ list, onSave, onClose }: {
  list: ShoppingList
  onSave: (budget: number | undefined, currency: string) => void
  onClose: () => void
}) {
  const { currency } = usePrefs()
  const [amount, setAmount] = useState(() => list.budgetCurrency === currency ? priceToInput(list.budget, currency) : '')
  const [error, setError] = useState<string | null>(null)
  function submit(event: FormEvent) {
    event.preventDefault()
    const budget = amount.trim() ? parsePrice(amount, currency) : undefined
    if (amount.trim() && (budget === undefined || /[^\d.,\s$€]/.test(amount))) {
      setError('Ingresa un presupuesto mayor o igual a cero y menor que 100.000.000.')
      return
    }
    onSave(budget, currency)
    onClose()
  }
  return (
    <BottomSheet title="Presupuesto de la lista" onClose={onClose}>
      <form className="field" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Presupuesto ({currency})</span>
          <input className="input" inputMode="decimal" maxLength={14} value={amount} placeholder="Sin presupuesto"
            onChange={(event) => { setAmount(event.target.value); setError(null) }} />
        </label>
        <p>Se compara con los precios que hayas cargado. Deja el campo vacío para quitar el presupuesto.</p>
        {list.budget !== undefined && list.budgetCurrency !== currency && <p>El presupuesto anterior está en {list.budgetCurrency}. Al guardar se reemplazará por el importe en {currency}.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="btn-row"><button className="btn" type="button" onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar</button></div>
      </form>
    </BottomSheet>
  )
}
