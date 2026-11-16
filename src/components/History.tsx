import { useState } from 'react'
import type { Purchase } from '../types'
import { formatPrice, pluralize } from '../lib/format'
import { matchesProductSearch } from '../lib/search'
import { itemTotal } from '../lib/pricing'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { SkeletonList } from './Skeleton'
import styles from './History.module.css'

const date = (value: number) => new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
export function History({ purchases, loading, onRepeat }: { purchases: Purchase[]; loading: boolean; onRepeat: (purchase: Purchase) => void }) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = purchases.find((entry) => entry.id === selectedId)
  const filtered = purchases.filter((entry) => matchesProductSearch(entry.name, query) || entry.items.some((item) => matchesProductSearch(item.name, query)))
  return <div className="page">
    <header className={styles.header}><h1>Historial</h1><p>Tus compras, con sus precios y moneda originales.</p></header>
    <label className="search"><Icon name="search" size={18} /><input className="input" type="search" aria-label="Buscar compras" placeholder="Buscar compra o producto" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(10) }} /></label>
    {loading && !purchases.length ? <SkeletonList count={4} /> : !filtered.length ? <div className="empty"><div className="empty-art">🧾</div><p className="empty-title">{query ? 'Sin resultados' : 'Todavía no hay compras'}</p><p>Usa «Finalizar compra» en una lista para guardarla aquí.</p></div> : <div className={styles.cards}>
      {filtered.slice(0, visible).map((entry) => <button key={entry.id} className={styles.card} type="button" onClick={() => setSelectedId(entry.id)}>
        <span className={styles.cardTop}><strong>{entry.name}</strong><Icon name="chevronRight" size={18} /></span>
        <time dateTime={new Date(entry.completedAt).toISOString()}>{date(entry.completedAt)}</time>
        <span>{pluralize(entry.purchasedCount, 'producto comprado', 'productos comprados')}</span>
        <strong>{entry.unpricedCount ? 'Total conocido: ' : ''}{formatPrice(entry.total, entry.currency)} {entry.currency}</strong>
        {entry.unpricedCount > 0 && <small>{pluralize(entry.unpricedCount, 'producto sin precio', 'productos sin precio')} · Total incompleto</small>}
        {entry.pending && <small role="status">Pendiente de sincronizar. Si aparece un rechazo, revísalo en el aviso de sincronización.</small>}
      </button>)}
      {visible < filtered.length && <button type="button" className="btn" onClick={() => setVisible((count) => count + 10)}>Ver más compras</button>}
    </div>}
    {selected && <BottomSheet title={selected.name} onClose={() => setSelectedId(null)}>
      <div className="field"><p>{date(selected.completedAt)}</p><strong>{selected.unpricedCount ? 'Total conocido' : 'Total'}: {formatPrice(selected.total, selected.currency)} {selected.currency}</strong>
        {selected.unpricedCount > 0 && <p>Total incompleto: {pluralize(selected.unpricedCount, 'producto comprado sin precio', 'productos comprados sin precio')}.</p>}
        {selected.budget !== undefined && <p>Presupuesto: {formatPrice(selected.budget, selected.budgetCurrency ?? selected.currency)} {selected.budgetCurrency ?? selected.currency}</p>}
        {[true, false].map((done) => selected.items.some((item) => item.done === done) && <section key={String(done)}><h3>{done ? 'Comprados' : 'No comprados'}</h3><ul className={styles.items}>
          {selected.items.filter((item) => item.done === done).sort((a, b) => a.position - b.position).map((item) => <li key={item.id}><span><strong>{item.name}</strong><small>{[item.quantity, item.categoryName].filter(Boolean).join(' · ')}</small></span><span>{itemTotal(item) === undefined ? 'Sin precio' : formatPrice(itemTotal(item)!, selected.currency)}</span></li>)}
        </ul></section>)}
        <p>Repetir crea una lista con los productos comprados y sus cantidades. Los precios y el presupuesto quedan vacíos para actualizarlos.</p>
        {selected.pending && <p role="status">Espera a que esta compra se sincronice para repetirla.</p>}
        <button type="button" className="btn btn-primary" disabled={selected.pending} onClick={() => { onRepeat(selected); setSelectedId(null) }}><Icon name="duplicate" size={18} />Repetir compra</button>
      </div>
    </BottomSheet>}
  </div>
}
