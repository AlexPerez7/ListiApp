import { useCallback, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_THRESHOLD = 84
const SWIPE_MAX = 120
const PEEK_OFFSET = 44
const START_SLOP = 10

interface Gesture {
  pointerId: number
  startX: number
  startY: number
  active: boolean
}

// Deslizar una fila hacia la izquierda para borrarla. El gesto solo se
// activa cuando el movimiento es claramente horizontal: así no interfiere
// con el scroll vertical ni con los toques sobre los botones de la fila, y
// un gesto interrumpido por el sistema (pointercancel) nunca borra nada.
export function useSwipeToDelete(onDelete: () => void) {
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)
  const gestureRef = useRef<Gesture | null>(null)
  const offsetRef = useRef(0)
  const swipedRef = useRef(false)

  const peek = useCallback(() => {
    setAnimating(true)
    setOffset(-PEEK_OFFSET)
    window.setTimeout(() => {
      setOffset(0)
      window.setTimeout(() => setAnimating(false), 400)
    }, 500)
  }, [])

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) return
    gestureRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: false }
    swipedRef.current = false
  }

  function onPointerMove(e: ReactPointerEvent) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== e.pointerId) return
    const dx = e.clientX - gesture.startX
    const dy = e.clientY - gesture.startY

    if (!gesture.active) {
      if (Math.abs(dy) > START_SLOP && Math.abs(dy) > Math.abs(dx)) {
        gestureRef.current = null
        return
      }
      if (dx > -START_SLOP || Math.abs(dx) < Math.abs(dy) * 1.5) return
      gesture.active = true
      swipedRef.current = true
      setAnimating(false)
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const clamped = Math.max(-SWIPE_MAX, Math.min(0, dx + START_SLOP))
    offsetRef.current = clamped
    setOffset(clamped)
  }

  function finish(shouldDelete: boolean) {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture?.active) return
    const reached = offsetRef.current <= -SWIPE_THRESHOLD
    offsetRef.current = 0
    setAnimating(true)
    setOffset(0)
    window.setTimeout(() => setAnimating(false), 250)
    if (shouldDelete && reached) onDelete()
  }

  // Un deslizamiento no debe contar además como un toque sobre la fila.
  function onClickCapture(e: MouseEvent) {
    if (!swipedRef.current) return
    swipedRef.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  return {
    offset,
    animating,
    willDelete: offset <= -SWIPE_THRESHOLD,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
      onClickCapture,
    },
    peek,
  }
}
