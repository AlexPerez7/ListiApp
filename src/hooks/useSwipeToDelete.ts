import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_THRESHOLD = 72
const SWIPE_MAX = 96
const PEEK_OFFSET = 40

// Swipe horizontal (izquierda) para borrar una fila. touch-action: pan-y en
// el elemento que usa estos handlers deja que el scroll vertical nativo siga
// funcionando mientras el gesto horizontal lo maneja este hook.
export function useSwipeToDelete(onDelete: () => void) {
  const [offset, setOffset] = useState(0)
  const [peeking, setPeeking] = useState(false)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const offsetRef = useRef(0)

  const peek = useCallback(() => {
    setPeeking(true)
    setOffset(-PEEK_OFFSET)
    window.setTimeout(() => {
      setOffset(0)
      window.setTimeout(() => setPeeking(false), 400)
    }, 450)
  }, [])

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    draggingRef.current = true
    startXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!draggingRef.current) return
    const dx = e.clientX - startXRef.current
    const clamped = Math.max(-SWIPE_MAX, Math.min(0, dx))
    offsetRef.current = clamped
    setOffset(clamped)
  }

  function endDrag() {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (offsetRef.current <= -SWIPE_THRESHOLD) onDelete()
    offsetRef.current = 0
    setOffset(0)
  }

  return {
    offset,
    peeking,
    revealed: offset <= -SWIPE_THRESHOLD / 2,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    peek,
  }
}
