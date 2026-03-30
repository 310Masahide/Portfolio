import type { FurikaeriEntriesMap, FurikaeriEntry, FurikaeriForm } from '../types/furikaeri'

const STORAGE_KEY = 'furikaeri_entries'

function normalizeEntry(raw: unknown, keyFallback?: string): FurikaeriEntry | null {
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

export function loadFurikaeriEntries(): FurikaeriEntriesMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return {}
    const parsed = JSON.parse(saved) as Record<string, unknown>
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: FurikaeriEntriesMap = {}
    for (const k of Object.keys(parsed)) {
      const e = normalizeEntry(parsed[k], k)
      if (e) out[e.date] = e
    }
    return out
  } catch {
    return {}
  }
}

export function saveFurikaeriEntries(entries: FurikaeriEntriesMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function upsertTodayEntry(
  current: FurikaeriEntriesMap,
  todayKey: string,
  form: FurikaeriForm,
  aiResponse?: string,
): FurikaeriEntriesMap {
  const prev = current[todayKey]
  const tagList = form.tags?.filter(Boolean) ?? []
  const updated: FurikaeriEntriesMap = {
    ...current,
    [todayKey]: {
      date: todayKey,
      events: form.events || undefined,
      aiResponse: aiResponse !== undefined ? aiResponse || undefined : prev?.aiResponse,
      pinned: prev?.pinned,
      tags: tagList.length > 0 ? [...new Set(tagList)] : undefined,
    },
  }
  saveFurikaeriEntries(updated)
  return updated
}

/** AI 解析なしで本文・タグだけ保存（タグ変更の即時反映用） */
export function upsertTodayDraft(
  current: FurikaeriEntriesMap,
  todayKey: string,
  form: FurikaeriForm,
): FurikaeriEntriesMap {
  const prev = current[todayKey]
  const tagList = form.tags?.filter(Boolean) ?? []
  const updated: FurikaeriEntriesMap = {
    ...current,
    [todayKey]: {
      date: todayKey,
      events: form.events || undefined,
      aiResponse: prev?.aiResponse,
      pinned: prev?.pinned,
      tags: tagList.length > 0 ? [...new Set(tagList)] : undefined,
    },
  }
  saveFurikaeriEntries(updated)
  return updated
}

export function patchEntry(
  current: FurikaeriEntriesMap,
  date: string,
  patch: Partial<Pick<FurikaeriEntry, 'pinned' | 'tags' | 'events' | 'aiResponse'>>,
): FurikaeriEntriesMap {
  const e = current[date]
  if (!e) return current
  const next: FurikaeriEntriesMap = {
    ...current,
    [date]: { ...e, ...patch },
  }
  saveFurikaeriEntries(next)
  return next
}

export function clearAllEntries(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function deleteEntryByDate(current: FurikaeriEntriesMap, date: string): FurikaeriEntriesMap {
  const { [date]: _, ...rest } = current
  saveFurikaeriEntries(rest)
  return rest
}
