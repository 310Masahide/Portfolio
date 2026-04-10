import { useMemo } from 'react'
import type { FurikaeriEntriesMap } from '../../types/furikaeri'
import { formatLocalDateKey, monthLocalDateKeyPrefix } from '../../utils/date'
import { reflectionLineCountForCalendar } from '../../utils/furikaeriEventLines'
import './Furikaeri.css'

/** 左から日曜始まり（Date#getDay() と列が一致） */
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

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
  const { cells, label, hasEntriesThisMonth, hasEntriesAnywhere } = useMemo(() => {
    const first = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()
    const startPad = first.getDay()
    const c: (number | null)[] = []
    for (let i = 0; i < startPad; i++) c.push(null)
    for (let d = 1; d <= lastDay; d++) c.push(d)
    const monthPrefix = monthLocalDateKeyPrefix(year, monthIndex)
    const keys = Object.keys(entries)
    return {
      cells: c,
      label: `${year}年${monthIndex + 1}月`,
      hasEntriesThisMonth: keys.some((k) => k.startsWith(monthPrefix)),
      hasEntriesAnywhere: keys.length > 0,
    }
  }, [year, monthIndex, entries])

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
      {hasEntriesAnywhere && !hasEntriesThisMonth && (
        <p className="furikaeri-calendar-month-empty" role="status">
          この月の記録はまだありません。‹ › で他の月へ移動できます。
        </p>
      )}
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
            return <div key={`e-${i}`} className="furikaeri-calendar-cell-empty" />
          }
          const key = formatLocalDateKey(year, monthIndex, d)
          const entry = entries[key]
          const has = Boolean(entry)
          const isToday = key === todayKey
          const lineBadge = has && entry ? reflectionLineCountForCalendar(entry) : 0
          return (
            <button
              key={key}
              type="button"
              className={`furikaeri-calendar-day ${has ? 'has-entry' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => has && onSelectDate(key)}
              disabled={!has}
              aria-label={
                has
                  ? `${key} 振返${lineBadge}件（出来事・改行区切り・空行除く）・記録を開く`
                  : `${key} 記録なし`
              }
            >
              <span className="furikaeri-calendar-day-num">{d}</span>
              {has && (
                <span
                  className="furikaeri-calendar-badge"
                  title={`「出来事」を改行で分けた行数（空行除く）です。振返 ${lineBadge}件として表示しています。`}
                >
                  <span className="furikaeri-calendar-badge-label">振返</span>
                  <span className="furikaeri-calendar-badge-value">
                    {lineBadge}
                    <span className="furikaeri-calendar-badge-unit">件</span>
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="furikaeri-calendar-hint">
        「振返 <strong>N</strong> 件」は、その日の「出来事」を改行で分けた行数です（空行は除き、記録がある日は最低 1）。タップで詳細を開けます。
      </p>
    </div>
  )
}
