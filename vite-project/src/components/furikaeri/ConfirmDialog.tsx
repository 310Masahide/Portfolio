import { useEffect } from 'react'

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
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
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
