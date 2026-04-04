import type { FurikaeriEntry } from '../types/furikaeri'

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/** localStorage から復元する 1 件分を正規化 */
export function normalizeStoredFurikaeriEntry(raw: unknown, keyFallback?: string): FurikaeriEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  let date = typeof o.date === 'string' ? o.date : ''
  if (!DATE_KEY_RE.test(date) && keyFallback && DATE_KEY_RE.test(keyFallback)) {
    date = keyFallback
  }
  if (!DATE_KEY_RE.test(date)) return null
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : undefined
  return {
    date,
    events: typeof o.events === 'string' ? o.events : undefined,
    aiResponse: typeof o.aiResponse === 'string' ? o.aiResponse : undefined,
    pinned: o.pinned === true,
    tags: tags?.length ? [...new Set(tags)] : undefined,
  }
}
