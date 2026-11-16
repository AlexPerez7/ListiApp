// Diálogo de confirmación basado en promesas: `if (await confirmDialog({...}))`.
// Lo dibuja <ConfirmHost />.
export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Acción destructiva: el botón de confirmar se muestra en rojo. Por defecto true. */
  danger?: boolean
}

export interface ActiveConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

let current: ActiveConfirm | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  current?.resolve(false)
  return new Promise((resolve) => {
    current = { ...options, resolve }
    emit()
  })
}

export function resolveConfirm(confirmed: boolean) {
  const active = current
  current = null
  emit()
  active?.resolve(confirmed)
}

export function subscribeConfirm(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getConfirm(): ActiveConfirm | null {
  return current
}
