import type { FurikaeriEntriesMap, FurikaeriForm } from '../types/furikaeri'

const STORAGE_KEY = 'furikaeri_entries'

export function loadFurikaeriEntries(): FurikaeriEntriesMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return {}
    const parsed = JSON.parse(saved) as FurikaeriEntriesMap
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
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
  aiResponse?: string
): FurikaeriEntriesMap {
  const updated: FurikaeriEntriesMap = {
    ...current,
    [todayKey]: {
      date: todayKey,
      events: form.events || undefined,
      aiResponse: aiResponse || current[todayKey]?.aiResponse,
    },
  }
  saveFurikaeriEntries(updated)
  return updated
}

export function clearAllEntries(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function deleteEntryByDate(current: FurikaeriEntriesMap, date: string): FurikaeriEntriesMap {
  const { [date]: _, ...rest } = current
  saveFurikaeriEntries(rest)
  return rest
}
