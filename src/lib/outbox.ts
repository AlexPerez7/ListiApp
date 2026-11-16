// Cola de cambios pendientes de enviar a Supabase.
//
// Cada cambio se aplica primero en pantalla (optimista) y se encola acá. La
// cola se guarda en localStorage y se envía en orden: si no hay conexión los
// cambios esperan y se reintentan al volver a estar en línea, en vez de
// perderse. Si el servidor rechaza un cambio (permisos, datos inválidos) se
// descarta y se avisa, para que la pantalla se vuelva a sincronizar.
import { supabase } from './supabaseClient'

type Row = Record<string, unknown>
type Match = Record<string, string | boolean>

export type OutboxOp =
  | { kind: 'upsert'; table: string; values: Row | Row[]; onConflict?: string }
  | { kind: 'update'; table: string; values: Row; match: Match }
  | { kind: 'delete'; table: string; match: Match }

interface QueuedOp {
  label: string
  op: OutboxOp
  attempts: number
}

const STORAGE_PREFIX = 'listiapp-outbox'
const RETRY_MIN_MS = 3000
const RETRY_MAX_MS = 30000

let userId: string | null = null
let queue: QueuedOp[] = []
let version = 0
let flushing = false
let retryDelay = RETRY_MIN_MS
let retryTimer: number | undefined
let storageIssue: string | null = null
let syncIssue: string | null = null

const listeners = new Set<() => void>()
const errorListeners = new Set<(label: string, message: string) => void>()
let idleWaiters: (() => void)[] = []

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}:${id}`
}

function persist() {
  if (!userId) return
  try {
    if (queue.length === 0) localStorage.removeItem(storageKey(userId))
    else localStorage.setItem(storageKey(userId), JSON.stringify(queue))
    storageIssue = null
  } catch {
    storageIssue = 'No se pudieron guardar los cambios en este dispositivo. Mantén la app abierta hasta sincronizar.'
  }
}

function notify() {
  for (const listener of listeners) listener()
  if (queue.length === 0 && idleWaiters.length > 0) {
    const waiters = idleWaiters
    idleWaiters = []
    for (const resolve of waiters) resolve()
  }
}

/** Activa la cola para un usuario (o la desactiva con null al cerrar sesión). */
export function setOutboxUser(nextUserId: string | null) {
  if (nextUserId === userId) return
  window.clearTimeout(retryTimer)
  retryDelay = RETRY_MIN_MS
  storageIssue = null
  syncIssue = null
  userId = nextUserId
  queue = []
  if (userId) {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      const parsed: unknown = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) queue = parsed as QueuedOp[]
    } catch {
      queue = []
    }
  }
  version++
  notify()
  void flush()
}

export function clearOutbox(id: string) {
  if (id === userId) queue = []
  try {
    localStorage.removeItem(storageKey(id))
  } catch {
    // nada que limpiar
  }
  notify()
}

export function enqueue(label: string, op: OutboxOp) {
  queue.push({ label, op, attempts: 0 })
  version++
  persist()
  notify()
  void flush()
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPendingCount(): number {
  return queue.length
}

export function getSyncIssue(): string | null {
  return storageIssue ?? syncIssue
}

export function retryPendingChanges() {
  window.clearTimeout(retryTimer)
  retryDelay = RETRY_MIN_MS
  void flush()
}

/** Cambia con cada cambio encolado: sirve para detectar lecturas obsoletas. */
export function getOutboxVersion(): number {
  return version
}

export function onOutboxError(listener: (label: string, message: string) => void): () => void {
  errorListeners.add(listener)
  return () => errorListeners.delete(listener)
}

/** Se resuelve cuando no quedan cambios por enviar. */
export function whenOutboxIdle(): Promise<void> {
  if (queue.length === 0) return Promise.resolve()
  return new Promise((resolve) => idleWaiters.push(resolve))
}

async function execute(op: OutboxOp): Promise<{ status: number; message: string } | null> {
  try {
    let result: { error: { message: string } | null; status: number }
    if (op.kind === 'upsert') {
      result = await supabase.from(op.table).upsert(op.values, { onConflict: op.onConflict ?? 'id' })
    } else if (op.kind === 'update') {
      let query = supabase.from(op.table).update(op.values)
      for (const [column, value] of Object.entries(op.match)) query = query.eq(column, value)
      result = await query
    } else {
      let query = supabase.from(op.table).delete()
      for (const [column, value] of Object.entries(op.match)) query = query.eq(column, value)
      result = await query
    }
    return result.error ? { status: result.status, message: result.error.message } : null
  } catch (err) {
    return { status: 0, message: err instanceof Error ? err.message : String(err) }
  }
}

function isNetworkFailure(status: number, message: string): boolean {
  return status === 0 || /failed to fetch|networkerror|load failed|network request failed/i.test(message)
}

function isTemporaryServerFailure(status: number): boolean {
  return status === 401 || status === 408 || status === 429 || status >= 500
}

function scheduleRetry() {
  window.clearTimeout(retryTimer)
  retryTimer = window.setTimeout(() => void flush(), retryDelay)
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
}

export async function flush(): Promise<void> {
  if (flushing || !userId || queue.length === 0) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  flushing = true
  const flushingFor = userId
  let interrupted = false
  try {
    while (queue.length > 0 && userId === flushingFor) {
      const head = queue[0]
      const failure = await execute(head.op)
      // La cola cambió de usuario mientras esperábamos la respuesta.
      if (userId !== flushingFor || queue[0] !== head) {
        interrupted = true
        break
      }

      if (failure && (isNetworkFailure(failure.status, failure.message) || isTemporaryServerFailure(failure.status))) {
        head.attempts++
        syncIssue = failure.status === 401
          ? 'No se pudo validar tu sesión. Tus cambios siguen pendientes; reintentaremos la conexión.'
          : 'No se pudo sincronizar. Conservamos tus cambios y volveremos a intentarlo.'
        persist()
        notify()
        scheduleRetry()
        return
      }

      syncIssue = null
      queue.shift()
      persist()
      retryDelay = RETRY_MIN_MS
      if (failure) {
        console.error(`No se pudo ${head.label}:`, failure.message)
        for (const listener of errorListeners) listener(head.label, failure.message)
      }
      notify()
    }
  } finally {
    flushing = false
  }
  if (interrupted) void flush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    retryDelay = RETRY_MIN_MS
    void flush()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush()
  })
}
