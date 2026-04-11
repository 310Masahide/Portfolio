import type { FurikaeriEntry } from '../types/furikaeri'

/** 出来事欄を改行で分けた行数（前後空白・空行は除く） */
export function countNonEmptyEventLines(events: string | undefined): number {
  const t = events?.trim()
  if (!t) return 0
  return t.split(/\r?\n/).filter((line) => line.trim().length > 0).length
}

/** カレンダー表示用: 記録のある日は最低 1 */
export function reflectionLineCountForCalendar(entry: FurikaeriEntry): number {
  return Math.max(1, countNonEmptyEventLines(entry.events))
}
