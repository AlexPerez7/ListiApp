import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import { fetchLists, useShoppingLists } from './hooks/useShoppingLists'
import { fetchCategories, useCategories } from './hooks/useCategories'
import { fetchCatalog, useProductCatalog } from './hooks/useProductCatalog'
import { useRoute } from './hooks/useRoute'
import { uploadItemImage, deleteItemImage, uploadCatalogImage, deleteCatalogImage } from './lib/imageUpload'
import { rememberProductPhoto } from './lib/productPhotos'
import { buildItemMemory } from './lib/itemSuggestions'
import { buildCatalogMap, normalizeProductName } from './lib/productCatalog'
import { buildBackup, downloadBackup, MAX_BACKUP_BYTES, parseBackup } from './lib/backup'
import { embedBackupImages, restoreBackupImages } from './lib/backupImages'
import { readAllPages } from './lib/pagination'
import { CURRENCIES, setCurrency, setTheme, usePrefs } from './lib/prefs'
import { clearCache } from './lib/cache'
import { clearOutbox, enqueue, getOutboxVersion, getPendingCount, onOutboxError, setOutboxUser } from './lib/outbox'
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
        Copia <strong>.env.example</strong> a <strong>.env</strong> y completa la URL y la clave pública de tu proyecto
        (Project Settings → API). Luego reinicia el servidor de desarrollo.
      </p>
      <code>{'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY='}</code>
    </div>
  )
}

function Workspace({ user }: { user: User }) {
  const userId = user.id
  const preferences = usePrefs()
  const activeRef = useRef(true)
  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupStatus, setBackupStatus] = useState('')
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
    addDefaultProducts,
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

  async function handleExport() {
    if (backupBusy) return
    setBackupBusy(true)
    setBackupStatus('Preparando respaldo completo…')
    try {
      if (!navigator.onLine) throw new Error('Conéctate a internet para exportar el respaldo completo, incluidas las fotos.')
      if (getPendingCount() > 0) throw new Error('Espera a que se sincronicen tus cambios antes de exportar.')
      const version = getOutboxVersion()
      const [allLists, allCategories, allProducts, photos] = await Promise.all([
        fetchLists(), fetchCategories(), fetchCatalog(),
        readAllPages<{ name_key: string; image_url: string }>((from, to) => supabase.from('product_photos')
          .select('name_key, image_url').order('id').range(from, to)),
      ])
      if (!allLists || !allCategories || !allProducts) throw new Error('No se pudieron cargar todos tus datos. Intenta de nuevo.')
      const payload = await embedBackupImages(buildBackup(allLists, allCategories, {
        catalog: allProducts, preferences,
        productPhotos: photos.map((photo) => ({ nameKey: photo.name_key, imageUrl: photo.image_url })),
      }))
      if (version !== getOutboxVersion()) throw new Error('Tus datos cambiaron durante la exportación. Vuelve a exportar.')
      if (!activeRef.current) return
      downloadBackup(payload)
      showToast({ kind: 'success', message: 'Respaldo completo descargado' })
    } catch (err) {
      showToast({ kind: 'error', message: err instanceof Error ? err.message : 'No se pudo exportar el respaldo.' })
    } finally {
      setBackupBusy(false)
      setBackupStatus('')
    }
  }

  async function handleImport(file: File) {
    if (backupBusy) return
    setBackupBusy(true)
    setBackupStatus('Preparando importación…')
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('El respaldo supera el límite de 25 MB.')
      let payload = parseBackup(await file.text())
      const confirmed = await confirmDialog({
        title: '¿Importar respaldo?',
        message: 'Se agregarán las listas y los productos y categorías que falten. Los existentes con el mismo nombre se conservarán. Se aplicarán el tema y la moneda del respaldo, si los incluye.',
        confirmLabel: 'Importar',
        danger: false,
      })
      if (!confirmed) return
      if (Object.keys(payload.images ?? {}).length > 0) {
        if (!navigator.onLine) throw new Error('Necesitas conexión para restaurar las fotos del respaldo.')
        setBackupStatus('Restaurando fotos…')
        payload = await restoreBackupImages(payload, userId)
      }
      if (!activeRef.current) return
      const restoredCategories = [...categories]
      const categoryNames = new Set(categories.map((entry) => normalizeProductName(entry.name)))
      let nextPosition = Math.max(-1, ...categories.map((entry) => entry.position)) + 1
      for (const entry of payload.categories ?? []) {
        const key = normalizeProductName(entry.name)
        if (categoryNames.has(key)) continue
        restoredCategories.push(createCategory(entry.name, entry.icon, nextPosition++))
        categoryNames.add(key)
      }
      const productNames = new Set(productCatalog.map((entry) => normalizeProductName(entry.name)))
      for (const entry of payload.catalog ?? []) {
        const key = normalizeProductName(entry.name)
        if (productNames.has(key)) continue
        createCatalogEntry(entry.name, entry.iconKey, entry.imageUrl)
        productNames.add(key)
      }
      for (const photo of payload.productPhotos ?? []) {
        enqueue('restaurar la foto recordada', { kind: 'upsert', table: 'product_photos',
          values: { name_key: photo.nameKey, image_url: photo.imageUrl }, onConflict: 'user_id,name_key' })
      }
      const count = shopping.importBackup(payload, restoredCategories)
      if (payload.preferences) {
        setTheme(payload.preferences.theme)
        if (CURRENCIES.some((entry) => entry.code === payload.preferences!.currency)) setCurrency(payload.preferences.currency)
      }
      showToast({ kind: 'success', message: `Respaldo agregado: ${pluralize(count, 'lista', 'listas')}. Los cambios pendientes se sincronizarán.` })
      setTab('lists')
    } catch (err) {
      showToast({
        kind: 'error',
        message: err instanceof Error ? err.message : 'No se pudo importar el archivo.',
      })
    } finally {
      setBackupBusy(false)
      setBackupStatus('')
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
            onAddDefaults={addDefaultProducts}
          />
        ) : (
          <Settings
            email={user.email}
            onExport={() => void handleExport()}
            backupBusy={backupBusy}
            backupStatus={backupStatus}
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
