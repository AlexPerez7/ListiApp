// Actualización de la app (PWA) bajo control de la persona: cuando hay una
// versión nueva descargada se avisa, y recién se aplica al tocar
// "Actualizar". Además se puede buscar una versión nueva a pedido, sin
// esperar a que el navegador lo haga por su cuenta.
import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'upToDate' | 'error'

const CHECK_INTERVAL_MS = 30 * 60 * 1000
const MIN_VISIBLE_CHECK_MS = 60 * 1000

let status: UpdateStatus = 'idle'
let registration: ServiceWorkerRegistration | undefined
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined
let lastCheck = 0
const listeners = new Set<() => void>()

function setStatus(next: UpdateStatus) {
  // Una vez que hay una versión lista, ese estado no se pisa.
  if (status === next || status === 'available') return
  status = next
  for (const listener of listeners) listener()
}

async function runCheck(): Promise<boolean> {
  if (!registration) return false
  lastCheck = Date.now()
  await registration.update()
  return true
}

export function initAppUpdate() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      setStatus('available')
    },
    onRegisteredSW(_url, reg) {
      registration = reg
      if (!reg) return
      // La versión nueva pudo quedar descargada en una visita anterior.
      if (reg.waiting && navigator.serviceWorker.controller) setStatus('available')

      window.setInterval(() => {
        if (navigator.onLine) void runCheck().catch(() => {})
      }, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (
          document.visibilityState === 'visible' &&
          navigator.onLine &&
          Date.now() - lastCheck > MIN_VISIBLE_CHECK_MS
        ) {
          void runCheck().catch(() => {})
        }
      })
    },
  })
}

/** Busca una versión nueva ahora. Si la hay, el estado pasa a 'available' al terminar de descargarse. */
export async function checkForUpdate() {
  if (status === 'available' || status === 'checking') return
  setStatus('checking')
  try {
    const checked = await runCheck()
    // Si encontró algo, el navegador lo está instalando: esperamos a que
    // termine (onNeedRefresh avisa) antes de decir que no hay novedades.
    const installing = registration?.installing
    if (checked && installing) {
      await new Promise<void>((resolve) => {
        const done = () => {
          if (installing.state === 'installed' || installing.state === 'redundant') resolve()
        }
        installing.addEventListener('statechange', done)
        window.setTimeout(resolve, 30000)
        done()
      })
    }
    if (registration?.waiting) setStatus('available')
    else setStatus('upToDate')
  } catch {
    setStatus('error')
  }
}

/** Activa la versión nueva y recarga la app. */
export function installUpdate() {
  if (!applyUpdate) {
    window.location.reload()
    return
  }
  void applyUpdate(true)
  // Si el service worker nuevo no toma el control (ej: otra pestaña lo
  // retiene), recargamos igual para no dejar el botón sin efecto.
  window.setTimeout(() => window.location.reload(), 4000)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(subscribe, () => status)
}
