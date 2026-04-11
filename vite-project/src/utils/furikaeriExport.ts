import type { FurikaeriEntriesMap, FurikaeriEntry } from '../types/furikaeri'
import { getTodayKey } from './date'

const EXPORT_VERSION = 1

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

function normalizeImportedEntry(raw: unknown, keyFallback?: string): FurikaeriEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  let date = typeof o.date === 'string' ? o.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) && keyFallback && /^\d{4}-\d{2}-\d{2}$/.test(keyFallback)) {
    date = keyFallback
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : undefined
  return {
    date,
    events: typeof o.events === 'string' ? o.events : undefined,
    aiResponse: typeof o.aiResponse === 'string' ? o.aiResponse : undefined,
    pinned: o.pinned === true,
    tags: tags?.length ? [...new Set(tags)] : undefined,
  }
}

/** バックアップ JSON をパースし、既存とマージ（同一日付はファイル側を優先） */
export function mergeImportedEntries(
  current: FurikaeriEntriesMap,
  jsonText: string,
): { ok: true; entries: FurikaeriEntriesMap } | { ok: false; error: string } {
  try {
    const data = JSON.parse(jsonText) as Record<string, unknown>
    let rawMap: Record<string, unknown> | null = null
    if (data.entries && typeof data.entries === 'object' && data.entries !== null) {
      rawMap = data.entries as Record<string, unknown>
    } else {
      const meta = new Set(['exportedAt', 'version'])
      const rest: Record<string, unknown> = {}
      for (const k of Object.keys(data)) {
        if (!meta.has(k)) rest[k] = data[k] as unknown
      }
      if (Object.keys(rest).length > 0) rawMap = rest
    }
    if (!rawMap) return { ok: false, error: 'JSON の形式が不正です（entries がありません）' }
    const incoming: FurikaeriEntriesMap = {}
    for (const k of Object.keys(rawMap)) {
      const e = normalizeImportedEntry(rawMap[k], k)
      if (e) incoming[e.date] = e
    }
    const merged = { ...current, ...incoming }
    return { ok: true, entries: merged }
  } catch {
    return { ok: false, error: 'JSON の読み取りに失敗しました' }
  }
}

export function downloadFurikaeriBackup(entries: FurikaeriEntriesMap): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    entries,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  triggerBlobDownload(blob, `furikaeri-backup-${new Date().toISOString().slice(0, 10)}.json`)
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
