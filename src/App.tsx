import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import { useShoppingLists } from './hooks/useShoppingLists'
import { useCategories } from './hooks/useCategories'
import { getInitialTheme, applyTheme, type Theme } from './lib/theme'
import { uploadItemImage, deleteItemImage } from './lib/imageUpload'
import { buildBackup, downloadBackup, parseBackup } from './lib/backup'
import { Home } from './components/Home'
import { Categories } from './components/Categories'
import { ListDetail } from './components/ListDetail'
import { TabBar, type Tab } from './components/TabBar'
import { Auth } from './components/Auth'
import { ResetPassword } from './components/ResetPassword'
import { Toast } from './components/Toast'
import type { Item, ShoppingList } from './types'
import styles from './App.module.css'

const UNDO_TIMEOUT_MS = 5000

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('lists')
  const [toast, setToast] = useState<{ id: number; message: string; onUndo: () => void } | null>(null)
  const toastTimeoutRef = useRef<number | undefined>(undefined)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const {
    lists,
    loading,
    createList,
    duplicateList,
    createListFromTemplate,
    toggleTemplate,
    deleteList,
    addItem,
    updateItem,
    reorderItems,
    toggleItem,
    setItemImage,
    deleteItem,
    updateListName,
    clearCompleted,
    restoreItem,
    restoreList,
    importBackup,
  } = useShoppingLists(session)

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories(session)

  function showUndoToast(message: string, onUndo: () => void, onExpire?: () => void) {
    window.clearTimeout(toastTimeoutRef.current)
    const id = Date.now()
    setToast({ id, message, onUndo })
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
      onExpire?.()
    }, UNDO_TIMEOUT_MS)
  }

  function handleUndoClick() {
    window.clearTimeout(toastTimeoutRef.current)
    toast?.onUndo()
  }

  function handleDeleteItem(list: ShoppingList, item: Item) {
    deleteItem(list.id, item.id)
    showUndoToast(
      `"${item.name}" eliminado`,
      () => {
        restoreItem(list.id, item)
        setToast(null)
      },
      () => {
        if (session && item.imageUrl) deleteItemImage(session.user.id, item.id, item.imageUrl)
      },
    )
  }

  function handleDeleteList(list: ShoppingList) {
    deleteList(list.id)
    setSelectedListId(null)
    showUndoToast(
      `Lista "${list.name}" eliminada`,
      () => {
        restoreList(list)
        setToast(null)
      },
      () => {
        if (!session) return
        for (const item of list.items) {
          if (item.imageUrl) deleteItemImage(session.user.id, item.id, item.imageUrl)
        }
      },
    )
  }

  async function handleUploadItemImage(listId: string, itemId: string, file: File) {
    if (!session) return
    try {
      const url = await uploadItemImage(session.user.id, itemId, file)
      setItemImage(listId, itemId, url)
    } catch (err) {
      console.error('Error al subir la foto del ítem:', err)
      throw err
    }
  }

  function handleExport() {
    downloadBackup(buildBackup(lists, categories))
  }

  async function handleImport(file: File) {
    try {
      const raw = await file.text()
      const payload = parseBackup(raw)
      await importBackup(payload, categories)
      alert(`Se importaron ${payload.lists.length} lista(s).`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo importar el archivo.')
    }
  }

  if (sessionLoading) {
    return <div className={styles.loadingScreen}>Cargando…</div>
  }

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />
  }

  if (!session) {
    return <Auth />
  }

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null

  if (selectedList) {
    return (
      <>
        <ListDetail
          list={selectedList}
          categories={categories}
          onBack={() => setSelectedListId(null)}
          onAddItem={(name, quantity, categoryId) => addItem(selectedList.id, name, quantity, categoryId)}
          onUpdateItem={(itemId, name, quantity, categoryId, price) =>
            updateItem(selectedList.id, itemId, name, quantity, categoryId, price)
          }
          onToggleItem={(itemId) => toggleItem(selectedList.id, itemId)}
          onDeleteItem={(itemId) => {
            const item = selectedList.items.find((i) => i.id === itemId)
            if (item) handleDeleteItem(selectedList, item)
          }}
          onReorderItems={(orderedItemIds) => reorderItems(selectedList.id, orderedItemIds)}
          onUploadItemImage={(itemId, file) => handleUploadItemImage(selectedList.id, itemId, file)}
          onRemoveItemImage={(itemId) => setItemImage(selectedList.id, itemId, undefined)}
          onClearCompleted={() => clearCompleted(selectedList.id)}
          onUpdateListName={(name) => updateListName(selectedList.id, name)}
          onDeleteList={() => handleDeleteList(selectedList)}
        />
        {toast && <Toast message={toast.message} actionLabel="Deshacer" onAction={handleUndoClick} />}
      </>
    )
  }

  return (
    <>
      <div className={styles.tabContent}>
        {activeTab === 'lists' ? (
          <Home
            lists={lists}
            loading={loading}
            theme={theme}
            onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            onCreateList={(name) => setSelectedListId(createList(name))}
            onSelectList={setSelectedListId}
            onDuplicateList={duplicateList}
            onDeleteList={(id) => {
              const list = lists.find((l) => l.id === id)
              if (list) handleDeleteList(list)
            }}
            onToggleTemplate={toggleTemplate}
            onUseTemplate={(id) => setSelectedListId(createListFromTemplate(id) ?? null)}
            onExport={handleExport}
            onImport={handleImport}
            onSignOut={() => supabase.auth.signOut()}
          />
        ) : (
          <Categories
            categories={categories}
            loading={categoriesLoading}
            onCreate={createCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {toast && <Toast message={toast.message} actionLabel="Deshacer" onAction={handleUndoClick} />}
    </>
  )
}

export default App
