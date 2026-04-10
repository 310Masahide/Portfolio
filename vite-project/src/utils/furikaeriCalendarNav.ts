/** カレンダー月送り（monthIndex は 0–11） */
export function goPrevMonth(year: number, monthIndex: number): { y: number; m: number } {
  if (monthIndex === 0) return { y: year - 1, m: 11 }
  return { y: year, m: monthIndex - 1 }
}

export function goNextMonth(year: number, monthIndex: number): { y: number; m: number } {
  if (monthIndex === 11) return { y: year + 1, m: 0 }
  return { y: year, m: monthIndex + 1 }
}
