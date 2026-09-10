import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'

export default function Modal({ open, onClose, title, children, footer, className = '' }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open) return
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [open])

  return createPortal(<dialog ref={dialogRef} aria-labelledby={titleId} aria-modal="true"
    onCancel={(event) => { event.preventDefault(); onClose() }}
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
    className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 text-primary shadow-2xl ${className}`}>
    <div className="flex items-center justify-between gap-4 border-b border-primary/10 px-6 py-5">
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <Button variant="ghost" size="sm" aria-label="Tutup dialog" onClick={onClose}><Icon name="close" /></Button>
    </div>
    <div className="p-6">{children}</div>
    {footer && <div className="flex justify-end gap-3 border-t border-primary/10 px-6 py-4">{footer}</div>}
  </dialog>, document.body)
}
