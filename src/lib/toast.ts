// Avisos breves al pie de la pantalla. Es un store a nivel de módulo para
// poder mostrarlos desde cualquier parte (hooks, cola de sincronización)
// sin pasar callbacks por toda la app. Lo dibuja <ToastHost />.
export type ToastKind = 'info' | 'success' | 'error'

export interface ToastOptions {
  message: string
  kind?: ToastKind
  actionLabel?: string
  onAction?: () => void
  /** Corre cuando el aviso se cierra sin que se use la acción (ej: limpieza definitiva tras no deshacer). */
  onExpire?: () => void
  duration?: number
}

export interface ActiveToast extends ToastOptions {
  id: number
  kind: ToastKind
}

let current: ActiveToast | null = null
let timer: number | undefined
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function expire() {
  const expired = current
  window.clearTimeout(timer)
  current = null
  emit()
  expired?.onExpire?.()
}

export function showToast(options: ToastOptions) {
  // El aviso anterior deja de ser accionable al reemplazarlo: corremos su
  // limpieza ahora en vez de perderla.
  if (current) {
    window.clearTimeout(timer)
    current.onExpire?.()
  }
  current = { ...options, id: nextId++, kind: options.kind ?? 'info' }
  emit()
  timer = window.setTimeout(expire, options.duration ?? (options.actionLabel ? 6000 : 3500))
}

export function runToastAction() {
  const active = current
  window.clearTimeout(timer)
  current = null
  emit()
  active?.onAction?.()
}

export function dismissToast() {
  if (current) expire()
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToast(): ActiveToast | null {
  return current
}
