import type { FurikaeriEntriesMap, FurikaeriEntry } from '../types/furikaeri'

export interface HistoryFilterOptions {
  query: string
  dateFrom: string
  dateTo: string
  tagFilter: string[]
  favoritesOnly: boolean
}

function entryText(e: FurikaeriEntry): string {
  return `${e.events ?? ''}\n${e.aiResponse ?? ''}`
}

function matchesQuery(e: FurikaeriEntry, q: string): boolean {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return entryText(e).toLowerCase().includes(t)
}

function matchesDateRange(dateKey: string, from: string, to: string): boolean {
  if (!from && !to) return true
  if (from && dateKey < from) return false
  if (to && dateKey > to) return false
  return true
}

function matchesTags(e: FurikaeriEntry, required: string[]): boolean {
  if (required.length === 0) return true
  const tags = new Set(e.tags ?? [])
  return required.every((t) => tags.has(t))
}

/** フィルタ後の日付キー（新しい順） */
export function filterSortedDates(entries: FurikaeriEntriesMap, opt: HistoryFilterOptions): string[] {
  const all = Object.keys(entries).sort((a, b) => b.localeCompare(a))
  const filtered = all.filter((date) => {
    const e = entries[date]
    if (!e) return false
    if (opt.favoritesOnly && !e.pinned) return false
    if (!matchesQuery(e, opt.query)) return false
    if (!matchesDateRange(date, opt.dateFrom, opt.dateTo)) return false
    if (!matchesTags(e, opt.tagFilter)) return false
    return true
  })
  return filtered.sort((a, b) => {
    const pa = entries[a]?.pinned ? 1 : 0
    const pb = entries[b]?.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    return b.localeCompare(a)
  })
}

/** 検索語を正規表現用にエスケープ */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type TextChunk = { text: string; hit: boolean }

/** 大文字小文字を区別しないハイライト用分割（query 空なら全文1チャンク） */
export function splitForHighlight(text: string, query: string): TextChunk[] {
  const q = query.trim()
  if (!q) return [{ text, hit: false }]
  let re: RegExp
  try {
    re = new RegExp(`(${escapeRegExp(q)})`, 'gi')
  } catch {
    return [{ text, hit: false }]
  }
  const parts: TextChunk[] = []
  let last = 0
  let m: RegExpExecArray | null
  const copy = new RegExp(re.source, re.flags)
  while ((m = copy.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ text: text.slice(last, m.index), hit: false })
    }
    parts.push({ text: m[0], hit: true })
    last = m.index + m[0].length
    if (m[0].length === 0) copy.lastIndex++
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), hit: false })
  }
  return parts.length ? parts : [{ text, hit: false }]
}
