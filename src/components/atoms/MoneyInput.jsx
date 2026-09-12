import { useLayoutEffect, useRef, useState } from 'react'
import { formatMoneyInput, moneyInputError, parseMoneyInput } from '../../utils/moneyInput'

export default function MoneyInput({ value, onValueChange, min = '0', ...props }) {
  const input = useRef(null)
  const caret = useRef(null)
  // Preserve incomplete or invalid edits so they can be corrected, never silently rounded.
  const [draft, setDraft] = useState(null)
  const display = draft?.value === value ? draft.display : formatMoneyInput(value)
  useLayoutEffect(() => {
    input.current.setCustomValidity(moneyInputError(value, min))
    if (caret.current !== null) {
      input.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  })

  function change(event) {
    const raw = event.target.value
    const next = parseMoneyInput(raw)
    const formatted = /^[\d.]*,?\d*$/.test(raw) ? formatMoneyInput(next) : raw
    const offset = raw.slice(0, event.target.selectionStart).replaceAll('.', '').length
    let position = 0
    let count = 0
    while (position < formatted.length && count < offset) {
      if (formatted[position] !== '.') count++
      position++
    }
    caret.current = position
    setDraft({ value: next, display: formatted })
    onValueChange(next)
  }

  function keyDown(event) {
    const el = event.currentTarget
    const start = el.selectionStart
    if (start !== el.selectionEnd) return
    // Delete a digit along with an adjacent grouping separator instead of re-inserting the dot.
    if (event.key === 'Backspace' && el.value[start - 1] === '.') {
      el.setSelectionRange(Math.max(0, start - 2), start)
    } else if (event.key === 'Delete' && el.value[start] === '.') {
      el.setSelectionRange(start, start + 2)
    }
  }

  return <input {...props} ref={input} type="text" inputMode="decimal" value={display} onChange={change} onKeyDown={keyDown} />
}
