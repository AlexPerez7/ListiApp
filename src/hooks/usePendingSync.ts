import { useSyncExternalStore } from 'react'
import { getPendingCount, subscribeOutbox } from '../lib/outbox'

/** Cantidad de cambios locales que todavía no se envían al servidor. */
export function usePendingSync(): number {
  return useSyncExternalStore(subscribeOutbox, getPendingCount)
}
