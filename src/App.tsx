import { useState } from 'react'
import { useShoppingLists } from './hooks/useShoppingLists'
import { Home } from './components/Home'
import { ListDetail } from './components/ListDetail'

function App() {
  const { lists, createList, deleteList, addItem, toggleItem, deleteItem } = useShoppingLists()
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

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
      onCreateList={(name) => setSelectedListId(createList(name))}
      onSelectList={setSelectedListId}
      onDeleteList={deleteList}
    />
  )
}

export default App
