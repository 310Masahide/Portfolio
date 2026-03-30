import type { FurikaeriEntriesMap } from '../../types/furikaeri'
import './Furikaeri.css'

/** 左から日曜始まり（Date#getDay() と列が一致） */
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function dateKeyFromYMD(y: number, m0: number, day: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(day)}`
}

interface FurikaeriCalendarViewProps {
  year: number
  monthIndex: number
  entries: FurikaeriEntriesMap
  todayKey: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (dateKey: string) => void
}

export function FurikaeriCalendarView({
  year,
  monthIndex,
  entries,
  todayKey,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: FurikaeriCalendarViewProps) {
  const first = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const startPad = first.getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= lastDay; d++) cells.push(d)

  const label = `${year}年${monthIndex + 1}月`

  return (
    <div className="furikaeri-calendar">
      <div className="furikaeri-calendar-nav">
        <button type="button" className="furikaeri-calendar-nav-btn" onClick={onPrevMonth} aria-label="前の月">
          ‹
        </button>
        <span className="furikaeri-calendar-title">{label}</span>
        <button type="button" className="furikaeri-calendar-nav-btn" onClick={onNextMonth} aria-label="次の月">
          ›
        </button>
      </div>
      <div className="furikaeri-calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="furikaeri-calendar-wd">
            {w}
          </div>
        ))}
      </div>
      <div className="furikaeri-calendar-grid">
        {cells.map((d, i) => {
          if (d === null) {
            return <div key={`e-${i}`} className="furikaeri-calendar-cell furikaeri-calendar-cell-empty" />
          }
          const key = dateKeyFromYMD(year, monthIndex, d)
          const has = Boolean(entries[key])
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              className={`furikaeri-calendar-cell furikaeri-calendar-day ${has ? 'has-entry' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => has && onSelectDate(key)}
              disabled={!has}
              aria-label={has ? `${key} の記録を開く` : `${key} 記録なし`}
            >
              <span className="furikaeri-calendar-day-num">{d}</span>
              {has && <span className="furikaeri-calendar-dot" aria-hidden />}
            </button>
          )
        })}
      </div>
      <p className="furikaeri-calendar-hint">ドットのある日をタップすると詳細を開けます</p>
    </div>
  )
}

export function goPrevMonth(year: number, monthIndex: number): { y: number; m: number } {
  if (monthIndex === 0) return { y: year - 1, m: 11 }
  return { y: year, m: monthIndex - 1 }
}

export function goNextMonth(year: number, monthIndex: number): { y: number; m: number } {
  if (monthIndex === 11) return { y: year + 1, m: 0 }
  return { y: year, m: monthIndex + 1 }
}
