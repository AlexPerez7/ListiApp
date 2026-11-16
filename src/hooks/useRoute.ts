import { useCallback, useEffect, useRef, useState } from 'react'

export type Tab = 'lists' | 'categories' | 'products' | 'settings'

export interface Route {
  tab: Tab
  listId: string | null
}

const TAB_PATHS: Record<Tab, string> = {
  lists: '#/',
  categories: '#/categorias',
  products: '#/productos',
  settings: '#/ajustes',
}

function parse(hash: string): Route {
  const listMatch = hash.match(/^#\/lista\/([\w-]+)$/)
  if (listMatch) return { tab: 'lists', listId: listMatch[1] }
  const tab = (Object.keys(TAB_PATHS) as Tab[]).find((key) => TAB_PATHS[key] === hash)
  return { tab: tab ?? 'lists', listId: null }
}

// Navegación mínima sobre el hash de la URL, para que el botón "atrás" del
// teléfono vuelva de una lista a la pantalla principal (en vez de cerrar la
// app) y para que recargar la página conserve dónde estabas.
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  const goingBackRef = useRef(false)

  useEffect(() => {
    const sync = () => {
      goingBackRef.current = false
      setRoute(parse(window.location.hash))
    }
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  const openList = useCallback((listId: string) => {
    window.history.pushState({ listiappList: true }, '', `#/lista/${listId}`)
    setRoute({ tab: 'lists', listId })
    window.scrollTo(0, 0)
  }, [])

  const closeList = useCallback(() => {
    // Si llegamos a la lista desde la app, "volver" es retroceder en el
    // historial; si se abrió directo por URL, reemplazamos la entrada.
    // history.back() es asíncrono: sin esta marca, una segunda llamada antes
    // de que termine retrocedería dos veces y sacaría a la persona de la app.
    if (goingBackRef.current) return
    setRoute({ tab: 'lists', listId: null })
    if (window.history.state?.listiappList) {
      goingBackRef.current = true
      window.history.back()
    } else {
      window.history.replaceState(null, '', TAB_PATHS.lists)
    }
  }, [])

  const setTab = useCallback((tab: Tab) => {
    window.history.replaceState(null, '', TAB_PATHS[tab])
    setRoute({ tab, listId: null })
    window.scrollTo(0, 0)
  }, [])

  return { route, openList, closeList, setTab }
}
