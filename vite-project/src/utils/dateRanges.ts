/** YYYY-MM-DD */
export function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function parseDateKey(key: string): Date {
  const [y, m, day] = key.split('-').map(Number)
  return new Date(y, m - 1, day)
}

/** 月の1日と最終日のキー（ローカル） */
export function monthRangeKeys(year: number, monthIndex0: string | number): { from: string; to: string } {
  const m = typeof monthIndex0 === 'string' ? parseInt(monthIndex0, 10) : monthIndex0
  const first = new Date(year, m, 1)
  const last = new Date(year, m + 1, 0)
  return { from: toDateKey(first), to: toDateKey(last) }
}

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end
}

export function presetRange(
  id: 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'clear',
): { from: string; to: string } | null {
  const now = new Date()
  if (id === 'clear') return null
  if (id === 'thisWeek') {
    return { from: toDateKey(startOfWeekMonday(now)), to: toDateKey(endOfWeekSunday(now)) }
  }
  if (id === 'thisMonth') {
    const y = now.getFullYear()
    const m = now.getMonth()
    return monthRangeKeys(y, m)
  }
  if (id === 'lastMonth') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    return monthRangeKeys(y, m)
  }
  if (id === 'last7') {
    const end = new Date(now)
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { from: toDateKey(start), to: toDateKey(end) }
  }
  if (id === 'last30') {
    const end = new Date(now)
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    return { from: toDateKey(start), to: toDateKey(end) }
  }
  return null
}
