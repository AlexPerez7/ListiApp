import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import { useShoppingLists } from './hooks/useShoppingLists'
import { Home } from './components/Home'
import { ListDetail } from './components/ListDetail'
import { Auth } from './components/Auth'
import styles from './App.module.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const { lists, loading, createList, deleteList, addItem, toggleItem, deleteItem } =
    useShoppingLists(session)

  if (sessionLoading) {
    return <div className={styles.loadingScreen}>Cargando…</div>
  }

  if (!session) {
    return <Auth />
  }

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null

  if (selectedList) {
    return (
      <ListDetail
        list={selectedList}
        onBack={() => setSelectedListId(null)}
        onAddItem={(name, quantity) => addItem(selectedList.id, name, quantity)}
        onToggleItem={(itemId) => toggleItem(selectedList.id, itemId)}
        onDeleteItem={(itemId) => deleteItem(selectedList.id, itemId)}
        onDeleteList={() => {
          deleteList(selectedList.id)
          setSelectedListId(null)
        }}
      />
    )
  }

  return (
    <Home
      lists={lists}
      loading={loading}
      onCreateList={(name) => setSelectedListId(createList(name))}
      onSelectList={setSelectedListId}
      onDeleteList={deleteList}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}

export default App
