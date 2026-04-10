import { useEffect, useLayoutEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ConfirmDialogProps {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  message,
  confirmLabel = '削除する',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevActiveRef = useRef<Element | null>(null)

  useLayoutEffect(() => {
    prevActiveRef.current = document.activeElement
    const root = overlayRef.current
    if (!root) return
    const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const first = focusables[0]
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusables.length === 0) return
      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else if (document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      const prev = prevActiveRef.current
      if (prev instanceof HTMLElement && document.body.contains(prev)) prev.focus()
    }
  }, [message, confirmLabel])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      ref={overlayRef}
      className="furikaeri-confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="確認"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="furikaeri-confirm-box">
        <p className="furikaeri-confirm-message">{message}</p>
        <div className="furikaeri-confirm-actions">
          <button type="button" className="furikaeri-confirm-cancel" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="furikaeri-confirm-ok" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
