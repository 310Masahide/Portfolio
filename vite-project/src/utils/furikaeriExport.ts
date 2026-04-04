import type { FurikaeriEntriesMap } from '../types/furikaeri'
import { getTodayKey } from './date'

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function entriesToPlainText(entries: FurikaeriEntriesMap): string {
  const dates = Object.keys(entries).sort((a, b) => b.localeCompare(a))
  const lines: string[] = []
  for (const d of dates) {
    const e = entries[d]
    lines.push(`=== ${d} ===`)
    lines.push(e.events ?? '（未入力）')
    if (e.aiResponse) {
      lines.push('--- AI ---')
      lines.push(e.aiResponse)
    }
    if (e.tags?.length) {
      lines.push(`タグ: ${e.tags.join(', ')}`)
    }
    if (e.pinned) lines.push('★ピン留め')
    lines.push('')
  }
  return lines.join('\n')
}

export function downloadFurikaeriText(entries: FurikaeriEntriesMap): void {
  const blob = new Blob([entriesToPlainText(entries)], { type: 'text/plain;charset=utf-8' })
  triggerBlobDownload(blob, `furikaeri-${getTodayKey()}.txt`)
}
