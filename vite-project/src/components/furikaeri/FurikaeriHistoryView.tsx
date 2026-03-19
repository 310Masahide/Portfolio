import { formatDate } from '../../utils/date'
import type { FurikaeriEntry } from '../../types/furikaeri'
import './Furikaeri.css'

interface FurikaeriHistoryViewProps {
  sortedDates: string[]
  entries: Record<string, FurikaeriEntry>
  todayKey: string
  onSelect: (entry: FurikaeriEntry) => void
  onClearAll: () => void
  onDeleteOne: (date: string) => void
}

export function FurikaeriHistoryView({
  sortedDates,
  entries,
  todayKey,
  onSelect,
  onClearAll,
  onDeleteOne,
}: FurikaeriHistoryViewProps) {
  return (
    <div className="furikaeri-history">
      <div className="furikaeri-history-header">
        <p className="furikaeri-count">{sortedDates.length}件の記録</p>
        {sortedDates.length > 0 && (
          <button
            type="button"
            className="furikaeri-voice-btn"
            onClick={onClearAll}
          >
            消去
          </button>
        )}
      </div>
      {sortedDates.length === 0 && (
        <div className="furikaeri-empty">まだ日記がありません</div>
      )}
      {sortedDates.map((date) => {
        const e = entries[date]
        const isToday = date === todayKey
        return (
          <div key={date} className="furikaeri-history-card">
            <div>
              <div className="furikaeri-history-date">
                {isToday && <span className="furikaeri-today-badge">● 今日</span>}
                {formatDate(date)}
              </div>
              <div className="furikaeri-history-preview">
                {e.events ? (
                  <span>{e.events.slice(0, 24)}{e.events.length > 24 ? '…' : ''}</span>
                ) : (
                  <span>（未入力）</span>
                )}
              </div>
            </div>
            <div className="furikaeri-history-actions">
              <button
                type="button"
                className="furikaeri-history-open"
                onClick={() => onSelect(e)}
              >
                詳細
              </button>
              <button
                type="button"
                className="furikaeri-history-delete"
                onClick={() => onDeleteOne(date)}
              >
                削除
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
