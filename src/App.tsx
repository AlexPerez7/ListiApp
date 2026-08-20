import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import { useShoppingLists } from './hooks/useShoppingLists'
import { useCategories } from './hooks/useCategories'
import { getInitialTheme, applyTheme, type Theme } from './lib/theme'
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
    deleteList,
    addItem,
    updateItem,
    swapItemPositions,
    toggleItem,
    deleteItem,
    updateListName,
    clearCompleted,
    restoreItem,
    restoreList,
  } = useShoppingLists(session)

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories(session)

  const itemSuggestions = useMemo(
    () => Array.from(new Set(lists.flatMap((list) => list.items.map((item) => item.name)))).sort(),
    [lists],
  )

  function showUndoToast(message: string, onUndo: () => void) {
    window.clearTimeout(toastTimeoutRef.current)
    const id = Date.now()
    setToast({ id, message, onUndo })
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, UNDO_TIMEOUT_MS)
  }

  function handleDeleteItem(list: ShoppingList, item: Item) {
    deleteItem(list.id, item.id)
    showUndoToast(`"${item.name}" eliminado`, () => {
      restoreItem(list.id, item)
      setToast(null)
    })
  }

  function handleDeleteList(list: ShoppingList) {
    deleteList(list.id)
    setSelectedListId(null)
    showUndoToast(`Lista "${list.name}" eliminada`, () => {
      restoreList(list)
      setToast(null)
    })
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
          itemSuggestions={itemSuggestions}
          onBack={() => setSelectedListId(null)}
          onAddItem={(name, quantity) => addItem(selectedList.id, name, quantity)}
          onUpdateItem={(itemId, name, quantity, categoryId, price) =>
            updateItem(selectedList.id, itemId, name, quantity, categoryId, price)
          }
          onToggleItem={(itemId) => toggleItem(selectedList.id, itemId)}
          onDeleteItem={(itemId) => {
            const item = selectedList.items.find((i) => i.id === itemId)
            if (item) handleDeleteItem(selectedList, item)
          }}
          onMoveItem={(itemId, neighborId) => swapItemPositions(selectedList.id, itemId, neighborId)}
          onClearCompleted={() => clearCompleted(selectedList.id)}
          onUpdateListName={(name) => updateListName(selectedList.id, name)}
          onDeleteList={() => handleDeleteList(selectedList)}
        />
        {toast && <Toast message={toast.message} actionLabel="Deshacer" onAction={toast.onUndo} />}
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

      {toast && <Toast message={toast.message} actionLabel="Deshacer" onAction={toast.onUndo} />}
    </>
  )
}

export default App
