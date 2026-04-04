export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export function getTodayKey(): string {
  const now = new Date()
  return formatLocalDateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

/** ローカル暦の YYYY-MM-DD（monthIndex は 0–11） */
export function formatLocalDateKey(year: number, monthIndex0: number, day: number): string {
  const m = String(monthIndex0 + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** その月の日付キー接頭辞（例: 2026-03-）— カレンダー月内判定用 */
export function monthLocalDateKeyPrefix(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-`
}
