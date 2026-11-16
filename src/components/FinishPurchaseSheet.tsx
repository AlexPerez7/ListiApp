import { useState } from 'react'
import type { ShoppingList } from '../types'
import { CURRENCIES, usePrefs } from '../lib/prefs'
import { formatPrice, pluralize } from '../lib/format'
import { itemTotal, sumItemTotals } from '../lib/pricing'
import { BottomSheet } from './BottomSheet'

function CurrencyOptions() {
  return CURRENCIES.map((entry) => <option key={entry.code} value={entry.code}>{entry.label}</option>)
}

export function CurrencySheet({ list, onSave, onClose }: { list: ShoppingList; onSave: (currency: string) => void; onClose: () => void }) {
  const preferences = usePrefs()
  const [currency, setCurrency] = useState(list.budgetCurrency ?? preferences.currency)
  return <BottomSheet title="Confirma la moneda" onClose={onClose}>
    <form className="field" onSubmit={(event) => { event.preventDefault(); onSave(currency) }}>
      <p>Esta lista es anterior al registro de moneda. Elige la moneda de sus precios actuales. Los importes se conservarán sin convertirlos.</p>
      <label className="field"><span className="field-label">Moneda de la lista</span><select className="input" value={currency} onChange={(event) => setCurrency(event.target.value)}><CurrencyOptions /></select></label>
      <button className="btn btn-primary" type="submit">Confirmar moneda</button>
    </form>
  </BottomSheet>
}

export function FinishPurchaseSheet({ list, onFinish, onClose }: { list: ShoppingList; onFinish: (currency: string) => void; onClose: () => void }) {
  const preferences = usePrefs()
  const [currency, setCurrency] = useState(list.currency ?? list.budgetCurrency ?? preferences.currency)
  const [currencyConfirmed, setCurrencyConfirmed] = useState(Boolean(list.currency))
  const [partialConfirmed, setPartialConfirmed] = useState(false)
  const bought = list.items.filter((item) => item.done)
  const unpriced = bought.filter((item) => itemTotal(item) === undefined).length
  const pending = list.items.length - bought.length
  return <BottomSheet title="Finalizar compra" onClose={onClose}>
    <form className="field" onSubmit={(event) => { event.preventDefault(); if (bought.length && currencyConfirmed && (!unpriced || partialConfirmed)) onFinish(currency) }}>
      <p>Se guardará una copia de «{list.name}» en el historial y se quitará de las listas activas.</p>
      {!list.currency ? <>
        <label className="field"><span className="field-label">Moneda de los precios guardados</span><select className="input" value={currency} onChange={(event) => { setCurrency(event.target.value); setCurrencyConfirmed(false) }}><CurrencyOptions /></select></label>
        <label><input type="checkbox" checked={currencyConfirmed} onChange={(event) => setCurrencyConfirmed(event.target.checked)} /> Confirmo que estos importes están en {currency}. No se convertirán.</label>
      </> : <p>Moneda: {currency}</p>}
      <p><strong>{pluralize(bought.length, 'producto comprado', 'productos comprados')}</strong></p>
      <p>{unpriced ? 'Total conocido' : 'Total'}: <strong>{formatPrice(sumItemTotals(bought), currency)} {currency}</strong></p>
      {unpriced > 0 && <label><input type="checkbox" checked={partialConfirmed} onChange={(event) => setPartialConfirmed(event.target.checked)} /> Guardar total incompleto: {pluralize(unpriced, 'producto comprado sin precio', 'productos comprados sin precio')}.</label>}
      {pending > 0 && <p>{pluralize(pending, 'producto sin marcar quedará registrado como no comprado', 'productos sin marcar quedarán registrados como no comprados')}. No se incluyen en el total ni al repetir la compra.</p>}
      <p>Después de finalizar, los productos y los importes del historial no se podrán editar.</p>
      {!bought.length && <p role="alert">Marca al menos un producto como comprado.</p>}
      <div className="btn-row"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={!bought.length || !currencyConfirmed || Boolean(unpriced && !partialConfirmed)}>Guardar en historial</button></div>
    </form>
  </BottomSheet>
}
