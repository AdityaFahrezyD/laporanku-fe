import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'

function isOutsidePanel(event) {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom
}

export default function Modal({ open, onClose, title, children, footer, className = '', variant = 'modal' }) {
  const dialogRef = useRef(null)
  const backdropPress = useRef(null)
  const titleId = useId()
  const drawer = variant === 'drawer'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open) return
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const bodyProperties = ['position', 'top', 'left', 'width']
    const previousBody = Object.fromEntries(bodyProperties.map((key) => [key, document.body.style[key]]))
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    if (drawer) {
      Object.assign(document.body.style, { position: 'fixed', top: -scrollY + 'px', left: -scrollX + 'px', width: '100%' })
      document.documentElement.style.overflow = 'hidden'
    }
    dialog.showModal()
    return () => {
      backdropPress.current = null
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (drawer) {
        Object.assign(document.body.style, previousBody)
        document.documentElement.style.overflow = previousRootOverflow
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      }
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [open, drawer])

  return createPortal(<dialog ref={dialogRef} aria-labelledby={titleId} aria-modal="true"
    onPointerDown={(event) => {
      backdropPress.current = drawer && event.isPrimary && event.button === 0 && isOutsidePanel(event)
        ? { x: event.clientX, y: event.clientY } : null
    }}
    onPointerMove={(event) => {
      const start = backdropPress.current
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) backdropPress.current = null
    }}
    onPointerCancel={() => { backdropPress.current = null }}
    onClick={(event) => {
      const start = backdropPress.current
      backdropPress.current = null
      // Native dialog backdrop clicks target the dialog itself; check coordinates too.
      // Close on a completed tap, never a drag that started inside the panel.
      if (drawer && start && isOutsidePanel(event) && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) onClose()
    }}
    onCancel={(event) => {
      // File inputs also emit cancel; only a cancel on this dialog should close it.
      if (event.target !== event.currentTarget) return
      event.preventDefault()
      onClose()
    }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const elements = [...event.currentTarget.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0)
      const first = elements[0]
      const last = elements.at(-1)
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }}
    className={`${drawer ? 'navigation-drawer' : 'fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl'} border-0 bg-white p-0 text-primary shadow-2xl ${className}`}>
    <div className={`flex shrink-0 items-center justify-between gap-4 border-b border-primary/10 bg-white px-6 py-5 ${drawer ? 'navigation-drawer-header' : ''}`}>
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <Button variant="ghost" size="sm" aria-label="Tutup dialog" onClick={onClose}><Icon name="close" /></Button>
    </div>
    <div className={drawer ? 'min-h-0 overflow-hidden bg-primary text-white' : 'p-6'}>{children}</div>
    {footer && <div className="flex justify-end gap-3 border-t border-primary/10 px-6 py-4">{footer}</div>}
  </dialog>, document.body)
}
