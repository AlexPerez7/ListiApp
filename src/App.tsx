import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import { useShoppingLists } from './hooks/useShoppingLists'
import { Home } from './components/Home'
import { ListDetail } from './components/ListDetail'
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
  const [toast, setToast] = useState<{ id: number; message: string; onUndo: () => void } | null>(null)
  const toastTimeoutRef = useRef<number | undefined>(undefined)

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
    deleteList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    updateListName,
    clearCompleted,
    restoreItem,
    restoreList,
  } = useShoppingLists(session)

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

  return (
    <>
      {selectedList ? (
        <ListDetail
          list={selectedList}
          onBack={() => setSelectedListId(null)}
          onAddItem={(name, quantity) => addItem(selectedList.id, name, quantity)}
          onUpdateItem={(itemId, name, quantity) => updateItem(selectedList.id, itemId, name, quantity)}
          onToggleItem={(itemId) => toggleItem(selectedList.id, itemId)}
          onDeleteItem={(itemId) => {
            const item = selectedList.items.find((i) => i.id === itemId)
            if (item) handleDeleteItem(selectedList, item)
          }}
          onClearCompleted={() => clearCompleted(selectedList.id)}
          onUpdateListName={(name) => updateListName(selectedList.id, name)}
          onDeleteList={() => handleDeleteList(selectedList)}
        />
      ) : (
        <Home
          lists={lists}
          loading={loading}
          onCreateList={(name) => setSelectedListId(createList(name))}
          onSelectList={setSelectedListId}
          onDeleteList={(id) => {
            const list = lists.find((l) => l.id === id)
            if (list) handleDeleteList(list)
          }}
          onSignOut={() => supabase.auth.signOut()}
        />
      )}

      {toast && <Toast message={toast.message} actionLabel="Deshacer" onAction={toast.onUndo} />}
    </>
  )
}

export default App
