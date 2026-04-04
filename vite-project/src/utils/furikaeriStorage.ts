import type { FurikaeriEntriesMap, FurikaeriEntry, FurikaeriForm } from '../types/furikaeri'
import { normalizeStoredFurikaeriEntry } from './furikaeriEntryNormalize'

const STORAGE_KEY = 'furikaeri_entries'

export type PersistOutcome = { map: FurikaeriEntriesMap; persisted: boolean }

type TodayAiMerge =
  | { kind: 'explicit'; value: string | undefined }
  | { kind: 'inherit' }

function buildTodaySlot(
  todayKey: string,
  form: FurikaeriForm,
  prev: FurikaeriEntry | undefined,
  ai: TodayAiMerge,
): FurikaeriEntry {
  const tagList = form.tags?.filter(Boolean) ?? []
  const aiResponse = ai.kind === 'inherit' ? prev?.aiResponse : ai.value || undefined
  return {
    date: todayKey,
    events: form.events || undefined,
    aiResponse,
    pinned: prev?.pinned,
    tags: tagList.length > 0 ? [...new Set(tagList)] : undefined,
  }
}

function persistMap(map: FurikaeriEntriesMap): PersistOutcome {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    return { map, persisted: true }
  } catch (e) {
    console.error('[furikaeriStorage] localStorage.setItem failed', e)
    return { map, persisted: false }
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
      const e = normalizeStoredFurikaeriEntry(parsed[k], k)
      if (e) out[e.date] = e
    }
    return out
  } catch {
    return {}
  }
}

export function upsertTodayEntry(
  current: FurikaeriEntriesMap,
  todayKey: string,
  form: FurikaeriForm,
  aiResponse?: string,
): PersistOutcome {
  const prev = current[todayKey]
  const merge: TodayAiMerge =
    aiResponse !== undefined ? { kind: 'explicit', value: aiResponse } : { kind: 'inherit' }
  const updated: FurikaeriEntriesMap = {
    ...current,
    [todayKey]: buildTodaySlot(todayKey, form, prev, merge),
  }
  return persistMap(updated)
}

/** AI 解析なしで本文・タグだけ保存（タグ変更の即時反映用） */
export function upsertTodayDraft(
  current: FurikaeriEntriesMap,
  todayKey: string,
  form: FurikaeriForm,
): PersistOutcome {
  const prev = current[todayKey]
  const updated: FurikaeriEntriesMap = {
    ...current,
    [todayKey]: buildTodaySlot(todayKey, form, prev, { kind: 'inherit' }),
  }
  return persistMap(updated)
}

export function patchEntry(
  current: FurikaeriEntriesMap,
  date: string,
  patch: Partial<Pick<FurikaeriEntry, 'pinned' | 'tags' | 'events' | 'aiResponse'>>,
): PersistOutcome {
  const e = current[date]
  if (!e) return { map: current, persisted: true }
  const next: FurikaeriEntriesMap = {
    ...current,
    [date]: { ...e, ...patch },
  }
  return persistMap(next)
}

export function clearAllEntries(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (e) {
    console.error('[furikaeriStorage] localStorage.removeItem failed', e)
    return false
  }
}

export function deleteEntryByDate(current: FurikaeriEntriesMap, date: string): PersistOutcome {
  if (!current[date]) return { map: current, persisted: true }
  const rest = { ...current }
  delete rest[date]
  return persistMap(rest)
}
