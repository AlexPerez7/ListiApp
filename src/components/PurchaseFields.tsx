import { currencyDecimals, formatPrice } from '../lib/format'
import { QUANTITY_UNITS, readPurchaseDraft, type PurchaseDraft } from '../lib/pricing'
import { usePrefs } from '../lib/prefs'
import styles from './ItemSheet.module.css'

export function PurchaseFields({ draft, onChange, currency: selectedCurrency }: { draft: PurchaseDraft; onChange: (draft: PurchaseDraft) => void; currency?: string }) {
  const preferences = usePrefs()
  const currency = selectedCurrency ?? preferences.currency
  const per = QUANTITY_UNITS.find((entry) => entry.value === draft.unit)!.per
  let subtotal: number | undefined
  try { subtotal = readPurchaseDraft(draft, currency).price } catch { /* El formulario muestra errores al guardar. */ }
  return (
    <>
      {draft.legacyQuantity !== undefined ? (
        <div className={styles.block}>
          <span>Cantidad guardada: {draft.legacyQuantity}</span>
          <button type="button" className="chip" onClick={() => onChange({ ...draft, legacyQuantity: undefined })}>
            Definir cantidad y unidad
          </button>
        </div>
      ) : (
        <div className={styles.row}>
          <label className="field" style={{ flex: 1 }}>
            <span className="field-label">Cantidad</span>
            <input className="input" inputMode="decimal" value={draft.quantity} maxLength={12}
              onChange={(event) => onChange({ ...draft, quantity: event.target.value })} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="field-label">Unidad</span>
            <select className="input" value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value as PurchaseDraft['unit'] })}>
              {QUANTITY_UNITS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className={styles.row}>
        <label className="field" style={{ flex: 1 }}>
          <span className="field-label">Tipo de precio</span>
          <select className="input" value={draft.mode} onChange={(event) => onChange({ ...draft,
            mode: event.target.value as PurchaseDraft['mode'],
            legacyQuantity: event.target.value === 'unit' ? undefined : draft.legacyQuantity,
          })}>
            <option value="unit">Por {per}</option>
            <option value="total">Total del ítem</option>
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span className="field-label">{draft.mode === 'unit' ? `Precio por ${per}` : 'Precio total'} ({currency})</span>
          <input className="input" inputMode={currencyDecimals(currency) === 0 ? 'numeric' : 'decimal'}
            value={draft.price} placeholder="Opcional" maxLength={14}
            onChange={(event) => onChange({ ...draft, price: event.target.value })} />
        </label>
      </div>
      {subtotal !== undefined && <p className={styles.notice} role="status">Subtotal: {formatPrice(subtotal, currency)}</p>}
      {draft.mode === 'total' && <small>Este precio ya incluye toda la cantidad; no se multiplica.</small>}
    </>
  )
}
