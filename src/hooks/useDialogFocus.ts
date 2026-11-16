import { useEffect, useRef, useState } from 'react'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'

/** Mantiene el foco en el modal superior y lo devuelve al cerrarlo. */
export function useDialogFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const [previous] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const isTop = () => [...document.querySelectorAll('[aria-modal="true"]')].at(-1) === dialog
    const controls = () => [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      .filter((element) => !element.closest('[hidden], [inert]'))
    const focusFirst = () => (controls()[0] ?? dialog).focus()
    if (!dialog.contains(document.activeElement)) focusFirst()
    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeRef.current()
      } else if (event.key === 'Tab') {
        const elements = controls()
        const index = elements.indexOf(document.activeElement as HTMLElement)
        if (elements.length === 0) { event.preventDefault(); dialog.focus(); return }
        if (event.shiftKey && index <= 0) { event.preventDefault(); elements.at(-1)!.focus() }
        else if (!event.shiftKey && (index === elements.length - 1 || index === -1)) {
          event.preventDefault(); elements[0].focus()
        }
      }
    }
    const onFocus = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !dialog.contains(event.target)) focusFirst()
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('focusin', onFocus)
      if (previous?.isConnected) previous.focus()
    }
  }, [open, previous])
  return ref
}
