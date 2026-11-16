import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { readCache, writeCache } from '../lib/cache'
import { getOutboxVersion, getPendingCount, onOutboxError, subscribeOutbox, whenOutboxIdle } from '../lib/outbox'

type DbRow = Record<string, unknown>
export type RealtimePayload = RealtimePostgresChangesPayload<DbRow>

interface RealtimeSource<T> {
  table: string
  apply: (prev: T[], payload: RealtimePayload) => T[]
}

interface Options<T> {
  userId: string
  /** Nombre de la copia local (y del canal de Realtime). */
  name: string
  /** Lee todo desde el servidor. Devuelve null si falla. */
  fetchAll: () => Promise<T[] | null>
  realtime: RealtimeSource<T>[]
  /** Corre tras la primera lectura exitosa (ej: sembrar datos iniciales). Devuelve los datos a usar. */
  afterFirstFetch?: (rows: T[]) => Promise<T[]>
}

const REFRESH_THROTTLE_MS = 15000

// Colección sincronizada con Supabase: abre con la copia local, se actualiza
// desde el servidor y por Realtime, y se vuelve a leer al recuperar la
// conexión o al volver a la app. Mientras hay cambios locales sin enviar
// (ver lib/outbox.ts) no pisa la pantalla con datos viejos del servidor.
export function useSyncedCollection<T>(options: Options<T>) {
  const { userId, name } = options
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const [initial] = useState(() => readCache<T[]>(userId, name))
  const [data, setData] = useState<T[]>(initial ?? [])
  const [loading, setLoading] = useState(initial === null)

  const firstFetchDoneRef = useRef(false)
  const missedEventsRef = useRef(false)
  const lastFetchRef = useRef(0)
  const activeRef = useRef(true)

  useEffect(() => {
    writeCache(userId, name, data)
  }, [userId, name, data])

  const inFlightRef = useRef<Promise<void> | null>(null)

  const runFetch = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await whenOutboxIdle()
      if (!activeRef.current) return
      const versionAtStart = getOutboxVersion()
      let rows = await optionsRef.current.fetchAll()
      if (!activeRef.current || rows === null) return
      // Hubo cambios locales mientras leíamos: esta lectura ya está obsoleta.
      if (versionAtStart !== getOutboxVersion() || getPendingCount() > 0) continue

      if (!firstFetchDoneRef.current) {
        firstFetchDoneRef.current = true
        if (optionsRef.current.afterFirstFetch) {
          rows = await optionsRef.current.afterFirstFetch(rows)
          if (!activeRef.current) return
        }
      }
      missedEventsRef.current = false
      lastFetchRef.current = Date.now()
      setData(rows)
      return
    }
  }, [])

  // Las lecturas simultáneas comparten una sola petición.
  const refetch = useCallback((): Promise<void> => {
    inFlightRef.current ??= runFetch().finally(() => {
      inFlightRef.current = null
    })
    return inFlightRef.current
  }, [runFetch])

  useEffect(() => {
    activeRef.current = true
    void refetch().finally(() => {
      if (activeRef.current) setLoading(false)
    })

    let channel = supabase.channel(`sync-${name}`)
    for (const source of optionsRef.current.realtime) {
      channel = channel.on<DbRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: source.table },
        (payload) => {
          // Con cambios propios en vuelo, el eco del servidor puede llegar
          // desordenado y revertir lo que se ve: lo saltamos y releemos al terminar.
          if (getPendingCount() > 0) {
            missedEventsRef.current = true
            return
          }
          setData((prev) => source.apply(prev, payload))
        },
      )
    }
    channel.subscribe()

    let debounce: number | undefined
    const refetchSoon = () => {
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => void refetch(), 400)
    }

    const unsubscribeOutbox = subscribeOutbox(() => {
      if (getPendingCount() === 0 && missedEventsRef.current) refetchSoon()
    })
    const unsubscribeErrors = onOutboxError(refetchSoon)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > REFRESH_THROTTLE_MS) {
        refetchSoon()
      }
    }
    window.addEventListener('online', refetchSoon)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      activeRef.current = false
      window.clearTimeout(debounce)
      unsubscribeOutbox()
      unsubscribeErrors()
      window.removeEventListener('online', refetchSoon)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [name, refetch])

  return { data, setData: setData as Dispatch<SetStateAction<T[]>>, loading, refetch }
}
