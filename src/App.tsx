import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import { useShoppingLists } from './hooks/useShoppingLists'
import { useCategories } from './hooks/useCategories'
import { useProductCatalog } from './hooks/useProductCatalog'
import { useRoute } from './hooks/useRoute'
import { uploadItemImage, deleteItemImage, uploadCatalogImage, deleteCatalogImage } from './lib/imageUpload'
import { rememberProductPhoto } from './lib/productPhotos'
import { buildItemMemory } from './lib/itemSuggestions'
import { buildCatalogMap } from './lib/productCatalog'
import { buildBackup, downloadBackup, parseBackup } from './lib/backup'
import { clearCache } from './lib/cache'
import { clearOutbox, getPendingCount, onOutboxError, setOutboxUser } from './lib/outbox'
import { showToast } from './lib/toast'
import { confirmDialog } from './lib/confirm'
import { pluralize } from './lib/format'
import { Home } from './components/Home'
import { Categories } from './components/Categories'
import { Products } from './components/Products'
import { ListDetail } from './components/ListDetail'
import { Settings } from './components/Settings'
import { TabBar } from './components/TabBar'
import { Auth } from './components/Auth'
import { ResetPassword } from './components/ResetPassword'
import { ConfirmHost, ToastHost } from './components/Overlays'
import { SyncBanner } from './components/SyncBanner'
import { SkeletonList } from './components/Skeleton'
import { Logo } from './components/Logo'
import type { Item, ShoppingList } from './types'
import styles from './App.module.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    // La cola de cambios pendientes se activa antes de mostrar los datos del
    // usuario, para que ninguna lectura pise cambios aún sin enviar.
    const applySession = (next: Session | null) => {
      setOutboxUser(next?.user.id ?? null)
      setSession(next)
    }

    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      applySession(next)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <SetupNotice />

  if (sessionLoading) {
    return (
      <div className={styles.splash}>
        <Logo size={72} className={styles.splashLogo} />
      </div>
    )
  }

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />
  }

  if (!session) {
    return <Auth />
  }

  return (
    <>
      <Workspace key={session.user.id} user={session.user} />
      <ConfirmHost />
    </>
  )
}

function SetupNotice() {
  return (
    <div className={styles.setup}>
      <Logo size={56} />
      <h1>Falta configurar Supabase</h1>
      <p>
        Copia <strong>.env.example</strong> a <strong>.env</strong> y completa las credenciales de tu proyecto
        (Project Settings → API). Luego reinicia el servidor de desarrollo.
      </p>
      <code>{'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY='}</code>
    </div>
  )
}

function Workspace({ user }: { user: User }) {
  const userId = user.id
  const { route, openList, closeList, setTab } = useRoute()

  const shopping = useShoppingLists(userId)
  const { lists, loading } = shopping
  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = useCategories(userId)
  const {
    catalog: productCatalog,
    loading: productCatalogLoading,
    createEntry: createCatalogEntry,
    updateEntry: updateCatalogEntry,
    deleteEntry: deleteCatalogEntry,
    setEntryImage: setCatalogEntryImage,
  } = useProductCatalog(userId)

  const itemMemory = useMemo(() => buildItemMemory(lists), [lists])
  const catalogMap = useMemo(() => buildCatalogMap(productCatalog), [productCatalog])

  useEffect(
    () =>
      onOutboxError((label) => {
        showToast({ kind: 'error', message: `No se pudo ${label}. Se recargaron tus datos.` })
      }),
    [],
  )

  const selectedList = route.listId ? (lists.find((list) => list.id === route.listId) ?? null) : null
  const listMissing = route.listId !== null && !selectedList && !loading

  // La lista de la URL ya no existe (se eliminó acá o en otro dispositivo).
  useEffect(() => {
    if (listMissing) closeList()
  }, [listMissing, closeList])

  function handleDeleteItem(list: ShoppingList, item: Item) {
    shopping.deleteItem(list.id, item.id)
    showToast({
      message: `«${item.name}» eliminado`,
      actionLabel: 'Deshacer',
      onAction: () => shopping.restoreItems(list.id, [item]),
      onExpire: () => {
        if (item.imageUrl) void deleteItemImage(userId, item.id, item.imageUrl)
      },
    })
  }

  function handleClearCompleted(list: ShoppingList) {
    const removed = shopping.clearCompleted(list.id)
    if (removed.length === 0) return
    showToast({
      message: `${pluralize(removed.length, 'ítem eliminado', 'ítems eliminados')}`,
      actionLabel: 'Deshacer',
      onAction: () => shopping.restoreItems(list.id, removed),
      onExpire: () => {
        for (const item of removed) {
          if (item.imageUrl) void deleteItemImage(userId, item.id, item.imageUrl)
        }
      },
    })
  }

  async function handleDeleteList(list: ShoppingList) {
    const confirmed = await confirmDialog({
      title: `¿Eliminar «${list.name}»?`,
      message:
        list.items.length > 0
          ? `Se eliminará la lista con ${pluralize(list.items.length, 'ítem', 'ítems')}.`
          : undefined,
    })
    if (!confirmed) return

    if (route.listId === list.id) closeList()
    shopping.deleteList(list.id)
    showToast({
      message: `Lista «${list.name}» eliminada`,
      actionLabel: 'Deshacer',
      onAction: () => shopping.restoreList(list),
      onExpire: () => {
        for (const item of list.items) {
          if (item.imageUrl) void deleteItemImage(userId, item.id, item.imageUrl)
        }
      },
    })
  }

  function handleDuplicateList(list: ShoppingList) {
    shopping.duplicateList(list.id)
    showToast({ kind: 'success', message: `Se creó «${list.name} (copia)»` })
  }

  function handleUseTemplate(list: ShoppingList) {
    const id = shopping.createListFromTemplate(list.id)
    if (id) openList(id)
  }

  function handleToggleTemplate(list: ShoppingList) {
    shopping.toggleTemplate(list.id)
    showToast({
      kind: 'success',
      message: list.isTemplate ? `«${list.name}» ya no es plantilla` : `«${list.name}» guardada como plantilla`,
    })
  }

  async function handleUploadItemImage(listId: string, itemId: string, file: File) {
    const url = await uploadItemImage(userId, itemId, file)
    shopping.setItemImage(listId, itemId, url)
    const itemName = lists.find((l) => l.id === listId)?.items.find((i) => i.id === itemId)?.name
    if (itemName) void rememberProductPhoto(itemName, url)
  }

  async function handleUploadCatalogImage(entryId: string, file: File) {
    const url = await uploadCatalogImage(userId, entryId, file)
    setCatalogEntryImage(entryId, url)
  }

  function handleDeleteCatalogEntry(entryId: string) {
    const entry = productCatalog.find((e) => e.id === entryId)
    deleteCatalogEntry(entryId)
    if (entry?.imageUrl) void deleteCatalogImage(userId, entryId, entry.imageUrl)
  }

  function handleRemoveCatalogImage(entryId: string) {
    const entry = productCatalog.find((e) => e.id === entryId)
    setCatalogEntryImage(entryId, undefined)
    if (entry?.imageUrl) void deleteCatalogImage(userId, entryId, entry.imageUrl)
  }

  function handleExport() {
    downloadBackup(buildBackup(lists, categories))
    showToast({ kind: 'success', message: 'Respaldo descargado' })
  }

  async function handleImport(file: File) {
    try {
      const payload = parseBackup(await file.text())
      const count = shopping.importBackup(payload, categories)
      showToast({ kind: 'success', message: `Se ${count === 1 ? 'importó' : 'importaron'} ${pluralize(count, 'lista', 'listas')}` })
      setTab('lists')
    } catch (err) {
      showToast({
        kind: 'error',
        message: err instanceof Error ? err.message : 'No se pudo importar el archivo.',
      })
    }
  }

  async function handleSignOut() {
    const pending = getPendingCount()
    const confirmed = await confirmDialog({
      title: '¿Cerrar sesión?',
      message:
        pending > 0
          ? `Tienes ${pluralize(pending, 'cambio', 'cambios')} sin sincronizar que se perderán si cierras sesión ahora.`
          : 'Tus listas quedan guardadas en tu cuenta.',
      confirmLabel: 'Cerrar sesión',
      danger: pending > 0,
    })
    if (!confirmed) return
    clearOutbox(userId)
    clearCache(userId)
    setTab('lists')
    await supabase.auth.signOut()
  }

  if (route.listId) {
    return (
      <>
        <SyncBanner />
        {selectedList ? (
          <ListDetail
            key={selectedList.id}
            list={selectedList}
            categories={categories}
            itemMemory={itemMemory}
            productCatalog={catalogMap}
            onBack={closeList}
            onAddItem={(input) => shopping.addItem(selectedList.id, input)}
            onUpdateItem={(itemId, input) => shopping.updateItem(selectedList.id, itemId, input)}
            onToggleItem={(itemId) => shopping.toggleItem(selectedList.id, itemId)}
            onDeleteItem={(item) => handleDeleteItem(selectedList, item)}
            onReorderItems={(orderedItemIds) => shopping.reorderItems(selectedList.id, orderedItemIds)}
            onUploadItemImage={(itemId, file) => handleUploadItemImage(selectedList.id, itemId, file)}
            onRemoveItemImage={(itemId) => shopping.setItemImage(selectedList.id, itemId, undefined)}
            onChooseItemIcon={(itemId, iconKey) => shopping.setItemIcon(selectedList.id, itemId, iconKey)}
            onClearCompleted={() => handleClearCompleted(selectedList)}
            onUncheckAll={() => shopping.uncheckAll(selectedList.id)}
            onRename={(name) => shopping.updateListName(selectedList.id, name)}
            onDuplicate={() => handleDuplicateList(selectedList)}
            onToggleTemplate={() => handleToggleTemplate(selectedList)}
            onUseTemplate={() => handleUseTemplate(selectedList)}
            onDeleteList={() => void handleDeleteList(selectedList)}
          />
        ) : (
          <div className="page">
            <SkeletonList count={5} />
          </div>
        )}
        <ToastHost aboveTabs={false} />
      </>
    )
  }

  return (
    <>
      <SyncBanner />
      <div className={styles.tabContent}>
        {route.tab === 'lists' ? (
          <Home
            lists={lists}
            loading={loading}
            productCatalog={catalogMap}
            onCreateList={(name) => openList(shopping.createList(name))}
            onSelectList={openList}
            onRenameList={shopping.updateListName}
            onDuplicateList={handleDuplicateList}
            onDeleteList={(list) => void handleDeleteList(list)}
            onToggleTemplate={handleToggleTemplate}
            onUseTemplate={handleUseTemplate}
          />
        ) : route.tab === 'categories' ? (
          <Categories
            categories={categories}
            lists={lists}
            loading={categoriesLoading}
            onCreate={createCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
            onReorder={reorderCategories}
          />
        ) : route.tab === 'products' ? (
          <Products
            catalog={productCatalog}
            loading={productCatalogLoading}
            onCreate={createCatalogEntry}
            onUpdate={updateCatalogEntry}
            onDelete={handleDeleteCatalogEntry}
            onUploadImage={handleUploadCatalogImage}
            onRemoveImage={handleRemoveCatalogImage}
          />
        ) : (
          <Settings
            email={user.email}
            listCount={lists.length}
            onExport={handleExport}
            onImport={(file) => void handleImport(file)}
            onSignOut={() => void handleSignOut()}
          />
        )}
      </div>

      <TabBar active={route.tab} onChange={setTab} />
      <ToastHost aboveTabs />
    </>
  )
}

export default App
