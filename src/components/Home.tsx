import { memo, useMemo, useState, type FormEvent } from 'react'
import type { ShoppingList } from '../types'
import type { CatalogIcon } from '../lib/productCatalog'
import { pluralize } from '../lib/format'
import { ActionSheet, BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { ItemThumb } from './ItemThumb'
import { RenameSheet } from './RenameSheet'
import { Logo } from './Logo'
import { SkeletonList } from './Skeleton'
import styles from './Home.module.css'
import { matchesTextSearch } from '../lib/search'

interface HomeProps {
  lists: ShoppingList[]
  loading: boolean
  productCatalog: Map<string, CatalogIcon>
  onCreateList: (name: string) => void
  onSelectList: (id: string) => void
  onRenameList: (id: string, name: string) => void
  onDuplicateList: (list: ShoppingList) => void
  onDeleteList: (list: ShoppingList) => void
  onToggleTemplate: (list: ShoppingList) => void
  onUseTemplate: (list: ShoppingList) => void
}

const NAME_IDEAS = ['Súper semanal', 'Feria', 'Farmacia', 'Asado', 'Cumpleaños', 'Ferretería']
const SEARCH_MIN_LISTS = 6
const PREVIEW_THUMBS = 5

export function Home({
  lists,
  loading,
  productCatalog,
  onCreateList,
  onSelectList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
  onToggleTemplate,
  onUseTemplate,
}: HomeProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [menuListId, setMenuListId] = useState<string | null>(null)
  const [renamingListId, setRenamingListId] = useState<string | null>(null)

  const filteredLists = useMemo(() => {
    if (!query.trim()) return lists
    return lists.filter((list) => matchesTextSearch(list.name, query))
  }, [lists, query])

  const templates = useMemo(() => filteredLists.filter((list) => list.isTemplate), [filteredLists])
  const regularLists = useMemo(() => filteredLists.filter((list) => !list.isTemplate), [filteredLists])
  const allTemplates = useMemo(() => lists.filter((list) => list.isTemplate), [lists])

  const menuList = lists.find((list) => list.id === menuListId)
  const renamingList = lists.find((list) => list.id === renamingListId)

  return (
    <div className="page page-with-fab">
      <header className={styles.brand}>
        <Logo size={44} className={styles.logo} />
        <div>
          <h1 className="page-title">Mis listas</h1>
          <p className="page-subtitle">
            {lists.length === 0 ? 'Tus compras, siempre a mano' : summary(lists)}
          </p>
        </div>
      </header>

      {lists.length >= SEARCH_MIN_LISTS && (
        <label className="search">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Buscar lista"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar lista"
          />
        </label>
      )}

      {loading ? (
        <SkeletonList />
      ) : lists.length === 0 ? (
        <div className="empty">
          <div className="empty-art">🛒</div>
          <p className="empty-title">Crea tu primera lista</p>
          <p>Anota lo que necesitas y márcalo mientras compras.</p>
          <button type="button" className="btn btn-accent" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} />
            Nueva lista
          </button>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Sin resultados</p>
          <p>Ninguna lista coincide con «{query}».</p>
        </div>
      ) : (
        <>
          {regularLists.length > 0 && (
            <ul className={styles.list}>
              {regularLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  productCatalog={productCatalog}
                  onSelect={onSelectList}
                  onOpenMenu={setMenuListId}
                  onUseTemplate={onUseTemplate}
                />
              ))}
            </ul>
          )}
          {templates.length > 0 && (
            <section className={styles.section}>
              <h2 className="section-label">Plantillas</h2>
              <ul className={styles.list}>
                {templates.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    productCatalog={productCatalog}
                    onSelect={onSelectList}
                    onOpenMenu={setMenuListId}
                    onUseTemplate={onUseTemplate}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {lists.length > 0 && (
        <div className="fab-layer">
          <button type="button" className="fab fab-above-tabs" onClick={() => setCreating(true)}>
            <Icon name="plus" size={22} />
            Nueva lista
          </button>
        </div>
      )}

      {creating && (
        <NewListSheet
          existingNames={lists.map((list) => list.name)}
          templates={allTemplates}
          onCreate={(name) => {
            setCreating(false)
            onCreateList(name)
          }}
          onUseTemplate={(list) => {
            setCreating(false)
            onUseTemplate(list)
          }}
          onClose={() => setCreating(false)}
        />
      )}

      {menuList && (
        <ActionSheet
          title={menuList.name}
          onClose={() => setMenuListId(null)}
          actions={[
            { label: 'Renombrar', icon: 'edit', onSelect: () => setRenamingListId(menuList.id) },
            { label: 'Duplicar', icon: 'duplicate', onSelect: () => onDuplicateList(menuList) },
            {
              label: menuList.isTemplate ? 'Quitar de plantillas' : 'Guardar como plantilla',
              icon: 'bookmark',
              onSelect: () => onToggleTemplate(menuList),
            },
            { label: 'Eliminar', icon: 'trash', danger: true, onSelect: () => onDeleteList(menuList) },
          ]}
        />
      )}

      {renamingList && (
        <RenameSheet
          title="Renombrar lista"
          initialName={renamingList.name}
          onSave={(name) => onRenameList(renamingList.id, name)}
          onClose={() => setRenamingListId(null)}
        />
      )}
    </div>
  )
}

function summary(lists: ShoppingList[]): string {
  const pending = lists
    .filter((list) => !list.isTemplate)
    .reduce((sum, list) => sum + list.items.filter((item) => !item.done).length, 0)
  return pending === 0 ? 'No tienes compras pendientes' : `${pluralize(pending, 'ítem pendiente', 'ítems pendientes')}`
}

interface ListCardProps {
  list: ShoppingList
  productCatalog: Map<string, CatalogIcon>
  onSelect: (id: string) => void
  onOpenMenu: (id: string) => void
  onUseTemplate: (list: ShoppingList) => void
}

const ListCard = memo(function ListCard({ list, productCatalog, onSelect, onOpenMenu, onUseTemplate }: ListCardProps) {
  const total = list.items.length
  const done = list.items.filter((item) => item.done).length
  const complete = total > 0 && done === total
  const preview = (list.isTemplate ? list.items : list.items.filter((item) => !item.done)).slice(0, PREVIEW_THUMBS)
  const previewTotal = list.isTemplate ? total : total - done

  let meta: string
  if (total === 0) meta = 'Sin ítems'
  else if (list.isTemplate) meta = pluralize(total, 'ítem', 'ítems')
  else if (complete) meta = '¡Todo comprado!'
  else meta = `${done} de ${total} comprados`

  return (
    <li className={styles.card}>
      <button type="button" className={styles.cardMain} onClick={() => onSelect(list.id)}>
        <span className={styles.cardName}>{list.name}</span>
        <span className={`${styles.cardMeta} ${complete ? styles.cardMetaDone : ''}`}>{meta}</span>

        {preview.length > 0 && (
          <span className={styles.thumbs} aria-hidden="true">
            {preview.map((item) => (
              <span key={item.id} className={styles.thumb}>
                <ItemThumb item={item} catalog={productCatalog} size={30} />
              </span>
            ))}
            {previewTotal > preview.length && (
              <span className={styles.thumbMore}>+{previewTotal - preview.length}</span>
            )}
          </span>
        )}

        {!list.isTemplate && total > 0 && (
          <span className={styles.progress} aria-hidden="true">
            <span
              className={`${styles.progressFill} ${complete ? styles.progressFillDone : ''}`}
              style={{ width: `${(done / total) * 100}%` }}
            />
          </span>
        )}
      </button>

      <div className={styles.cardSide}>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Más opciones de ${list.name}`}
          onClick={() => onOpenMenu(list.id)}
        >
          <Icon name="more" size={20} />
        </button>
        {list.isTemplate && (
          <button type="button" className={styles.useButton} onClick={() => onUseTemplate(list)}>
            Usar
          </button>
        )}
      </div>
    </li>
  )
})

interface NewListSheetProps {
  existingNames: string[]
  templates: ShoppingList[]
  onCreate: (name: string) => void
  onUseTemplate: (list: ShoppingList) => void
  onClose: () => void
}

function NewListSheet({ existingNames, templates, onCreate, onUseTemplate, onClose }: NewListSheetProps) {
  const [name, setName] = useState('')
  const ideas = NAME_IDEAS.filter((idea) => !existingNames.includes(idea))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onCreate(trimmed)
  }

  return (
    <BottomSheet title="Nueva lista" onClose={onClose}>
      <form className={styles.sheetForm} onSubmit={handleSubmit}>
        <input
          className="input"
          type="text"
          placeholder="Nombre de la lista"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          enterKeyHint="done"
          aria-label="Nombre de la lista"
          autoFocus
        />
        {ideas.length > 0 && (
          <div className="chip-scroll">
            {ideas.map((idea) => (
              <button key={idea} type="button" className="chip" onClick={() => onCreate(idea)}>
                {idea}
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-accent btn-block" type="submit" disabled={!name.trim()}>
          Crear lista
        </button>
      </form>

      {templates.length > 0 && (
        <section className={styles.section}>
          <h3 className="section-label">O parte de una plantilla</h3>
          <div className="chip-scroll">
            {templates.map((template) => (
              <button key={template.id} type="button" className="chip" onClick={() => onUseTemplate(template)}>
                <Icon name="bookmark" size={14} filled />
                {template.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </BottomSheet>
  )
}
