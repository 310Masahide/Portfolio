import { useMemo, useRef, type ChangeEvent } from 'react'
import { formatDate } from '../../utils/date'
import type { FurikaeriEntry, HistoryDisplayMode } from '../../types/furikaeri'
import { splitForHighlight } from '../../utils/furikaeriFilters'
import { FURIKAERI_TAG_OPTIONS } from '../../constants/furikaeriTags'
import { FurikaeriCalendarView } from './FurikaeriCalendarView'
import { goNextMonth, goPrevMonth } from '../../utils/furikaeriCalendarNav'
import './Furikaeri.css'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function parseYmd(value: string): { y: number; m: number; d: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [ys, ms, ds] = value.split('-').map(Number)
  if (!ys || ms < 1 || ms > 12 || ds < 1) return null
  if (ds > daysInMonth(ys, ms)) return null
  return { y: ys, m: ms, d: ds }
}

function composeYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

function HistoryDateTriplet({
  value,
  onChange,
  idPrefix,
  legend,
}: {
  value: string
  onChange: (v: string) => void
  idPrefix: string
  legend: string
}) {
  const years = useMemo(() => {
    const n = new Date()
    const maxY = n.getFullYear() + 1
    const minY = n.getFullYear() - 25
    const ys: number[] = []
    for (let y = maxY; y >= minY; y--) ys.push(y)
    return ys
  }, [])

  const p = parseYmd(value)
  const y = p?.y ?? 0
  const m = p?.m ?? 0
  const d = p?.d ?? 0
  const dim = y > 0 && m > 0 ? daysInMonth(y, m) : 31

  const apply = (ny: number, nm: number, nd: number) => {
    if (ny <= 0 || nm <= 0 || nd <= 0) {
      onChange('')
      return
    }
    const cap = daysInMonth(ny, nm)
    onChange(composeYmd(ny, nm, Math.min(nd, cap)))
  }

  const onYear = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (!v) {
      onChange('')
      return
    }
    const ny = Number(v)
    apply(ny, m || 1, d || 1)
  }

  const onMonth = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (!v) {
      onChange('')
      return
    }
    if (!y) return
    apply(y, Number(v), d || 1)
  }

  const onDay = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (!v) {
      onChange('')
      return
    }
    if (!y || !m) return
    apply(y, m, Number(v))
  }

  const dayOptions = Array.from({ length: dim }, (_, i) => i + 1)

  return (
    <div className="furikaeri-date-triplet" role="group" aria-label={legend}>
      <select
        id={`${idPrefix}-y`}
        className="furikaeri-date-select"
        value={y || ''}
        onChange={onYear}
        aria-label={`${legend}・年`}
      >
        <option value="">年</option>
        {years.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-m`}
        className="furikaeri-date-select"
        value={m || ''}
        onChange={onMonth}
        disabled={!y}
        aria-label={`${legend}・月`}
      >
        <option value="">月</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-d`}
        className="furikaeri-date-select"
        value={d || ''}
        onChange={onDay}
        disabled={!y || !m}
        aria-label={`${legend}・日`}
      >
        <option value="">日</option>
        {dayOptions.map((dd) => (
          <option key={dd} value={dd}>
            {dd}
          </option>
        ))}
      </select>
    </div>
  )
}

function HighlightPreview({ text, query, maxLen = 80 }: { text: string; query: string; maxLen?: number }) {
  const slice = text.slice(0, maxLen)
  const parts = useMemo(() => splitForHighlight(slice, query), [slice, query])
  return (
    <span>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="furikaeri-search-hit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
      {text.length > maxLen ? '…' : ''}
    </span>
  )
}

export interface HistoryFilterProps {
  historyQuery: string
  setHistoryQuery: (q: string) => void
  dateFrom: string
  dateTo: string
  setDateFrom: (v: string) => void
  setDateTo: (v: string) => void
  applyDatePreset: (id: 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'clear') => void
  historyTagFilter: string[]
  toggleHistoryTagFilter: (tag: string) => void
  allTagsInUse: string[]
  favoritesOnly: boolean
  setFavoritesOnly: (v: boolean) => void
}

export interface HistoryPaginationProps {
  historyPage: number
  totalPages: number
  pageSize: number
  setHistoryPage: (p: number) => void
}

export interface HistoryDisplayProps {
  historyMode: HistoryDisplayMode
  setHistoryMode: (m: HistoryDisplayMode) => void
  calendarYear: number
  calendarMonth: number
  setCalendarYear: (y: number) => void
  setCalendarMonth: (m: number) => void
}

interface FurikaeriHistoryViewProps {
  entries: Record<string, FurikaeriEntry>
  todayKey: string
  paginatedDates: string[]
  totalFiltered: number
  filterProps: HistoryFilterProps
  paginationProps: HistoryPaginationProps
  displayProps: HistoryDisplayProps
  onSelect: (entry: FurikaeriEntry) => void
  onClearAll: () => void
  onDeleteOne: (date: string) => void
  onTogglePin: (date: string) => void
  exportJson: () => void
  exportText: () => void
  importBackupJson: (text: string) => { ok: boolean; error?: string }
}

function FilterToolbar({ filter }: { filter: HistoryFilterProps }) {
  const {
    historyQuery,
    setHistoryQuery,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    applyDatePreset,
    historyTagFilter,
    toggleHistoryTagFilter,
    allTagsInUse,
    favoritesOnly,
    setFavoritesOnly,
  } = filter

  const tagOptions = useMemo(
    () => [...new Set([...FURIKAERI_TAG_OPTIONS, ...allTagsInUse])].sort(),
    [allTagsInUse],
  )

  return (
    <div className="furikaeri-toolbar">
      <label className="furikaeri-search-label">
        <span className="furikaeri-toolbar-label">キーワード</span>
        <input
          type="search"
          className="furikaeri-search-input"
          value={historyQuery}
          onChange={(e) => setHistoryQuery(e.target.value)}
          placeholder="出来事・AIの文面を検索"
          autoComplete="off"
        />
      </label>

      <div className="furikaeri-presets">
        <span className="furikaeri-toolbar-label">期間</span>
        <div className="furikaeri-preset-row">
          <button type="button" className="furikaeri-preset-btn" onClick={() => applyDatePreset('thisWeek')}>
            今週
          </button>
          <button type="button" className="furikaeri-preset-btn" onClick={() => applyDatePreset('thisMonth')}>
            今月
          </button>
          <button type="button" className="furikaeri-preset-btn" onClick={() => applyDatePreset('lastMonth')}>
            先月
          </button>
          <button type="button" className="furikaeri-preset-btn" onClick={() => applyDatePreset('last7')}>
            過去7日
          </button>
          <button type="button" className="furikaeri-preset-btn" onClick={() => applyDatePreset('last30')}>
            過去30日
          </button>
          <button type="button" className="furikaeri-preset-btn furikaeri-preset-clear" onClick={() => applyDatePreset('clear')}>
            期間クリア
          </button>
        </div>
        <div className="furikaeri-date-range">
          <HistoryDateTriplet value={dateFrom} onChange={setDateFrom} idPrefix="furikaeri-from" legend="開始日" />
          <span className="furikaeri-date-tilde">〜</span>
          <HistoryDateTriplet value={dateTo} onChange={setDateTo} idPrefix="furikaeri-to" legend="終了日" />
        </div>
      </div>

      <label className="furikaeri-fav-filter">
        <input
          type="checkbox"
          checked={favoritesOnly}
          onChange={(e) => setFavoritesOnly(e.target.checked)}
        />
        ピン留めのみ
      </label>

      {tagOptions.length > 0 && (
        <div className="furikaeri-tag-filter-block">
          <span className="furikaeri-toolbar-label">タグで絞る</span>
          <div className="furikaeri-tag-filter-row">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`furikaeri-tag-filter-chip ${historyTagFilter.includes(tag) ? 'on' : ''}`}
                onClick={() => toggleHistoryTagFilter(tag)}
                aria-pressed={historyTagFilter.includes(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function FurikaeriHistoryView({
  entries,
  todayKey,
  paginatedDates,
  totalFiltered,
  filterProps,
  paginationProps,
  displayProps,
  onSelect,
  onClearAll,
  onDeleteOne,
  onTogglePin,
  exportJson,
  exportText,
  importBackupJson,
}: FurikaeriHistoryViewProps) {
  const { historyPage, totalPages, pageSize, setHistoryPage } = paginationProps
  const { historyMode, setHistoryMode, calendarYear, calendarMonth, setCalendarYear, setCalendarMonth } =
    displayProps
  const { historyQuery } = filterProps

  const fileRef = useRef<HTMLInputElement>(null)
  const onImportPick = () => fileRef.current?.click()
  const onImportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const text = await f.text()
    const r = importBackupJson(text)
    if (!r.ok) window.alert(r.error ?? '読み込みに失敗しました')
    else window.alert('バックアップをマージしました（同一日付はファイルの内容で上書き）')
  }

  const entryCount = Object.keys(entries).length

  return (
    <div className="furikaeri-history">
      <div className="furikaeri-history-header">
        <p className="furikaeri-count">
          {totalFiltered === entryCount
            ? `${totalFiltered}件の記録`
            : `表示 ${totalFiltered}件 / 全 ${entryCount}件`}
        </p>
        <div className="furikaeri-history-header-actions">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="furikaeri-file-input"
            onChange={onImportChange}
            aria-label="JSONバックアップを選択"
          />
          <button type="button" className="furikaeri-export-btn" onClick={onImportPick}>
            JSON読込
          </button>
          <button type="button" className="furikaeri-export-btn" onClick={exportJson}>
            JSON出力
          </button>
          <button type="button" className="furikaeri-export-btn" onClick={exportText}>
            テキスト出力
          </button>
          {entryCount > 0 && (
            <button type="button" className="furikaeri-export-btn" onClick={onClearAll}>
              全消去
            </button>
          )}
        </div>
      </div>

      <div className="furikaeri-history-mode">
        <button
          type="button"
          className={`furikaeri-mode-tab ${historyMode === 'list' ? 'active' : ''}`}
          onClick={() => setHistoryMode('list')}
        >
          リスト
        </button>
        <button
          type="button"
          className={`furikaeri-mode-tab ${historyMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setHistoryMode('calendar')}
        >
          カレンダー
        </button>
      </div>

      {historyMode === 'list' && (
        <>
          <FilterToolbar filter={filterProps} />

          {totalFiltered === 0 && entryCount > 0 && (
            <div className="furikaeri-empty">条件に一致する記録がありません</div>
          )}
          {entryCount === 0 && <div className="furikaeri-empty">まだ日記がありません</div>}

          {paginatedDates.map((date) => {
            const e = entries[date]
            if (!e) return null
            const isToday = date === todayKey
            const preview = e.events || '（未入力）'
            return (
              <div key={date} className="furikaeri-history-card">
                <div>
                  <div className="furikaeri-history-date">
                    {e.pinned && <span className="furikaeri-pin-badge" title="ピン留め">★</span>}
                    {isToday && <span className="furikaeri-today-badge">● 今日</span>}
                    {formatDate(date)}
                  </div>
                  {e.tags && e.tags.length > 0 && (
                    <div className="furikaeri-card-tags">
                      {e.tags.map((t) => (
                        <span key={t} className="furikaeri-card-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="furikaeri-history-preview">
                    <HighlightPreview text={preview} query={historyQuery} />
                  </div>
                </div>
                <div className="furikaeri-history-actions">
                  <button
                    type="button"
                    className="furikaeri-pin-btn"
                    onClick={() => onTogglePin(date)}
                    aria-label={e.pinned ? 'ピンを外す' : 'ピン留め'}
                    title={e.pinned ? 'ピンを外す' : 'ピン留め'}
                  >
                    {e.pinned ? '★' : '☆'}
                  </button>
                  <button type="button" className="furikaeri-history-open" onClick={() => onSelect(e)}>
                    詳細
                  </button>
                  <button type="button" className="furikaeri-history-delete" onClick={() => onDeleteOne(date)}>
                    削除
                  </button>
                </div>
              </div>
            )
          })}

          {totalFiltered > pageSize && (
            <nav className="furikaeri-pagination" aria-label="ページ送り">
              <button
                type="button"
                className="furikaeri-page-btn"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage(historyPage - 1)}
              >
                前へ
              </button>
              <span className="furikaeri-page-info">
                {historyPage} / {totalPages} ページ（{pageSize}件/ページ）
              </span>
              <button
                type="button"
                className="furikaeri-page-btn"
                disabled={historyPage >= totalPages}
                onClick={() => setHistoryPage(historyPage + 1)}
              >
                次へ
              </button>
            </nav>
          )}
        </>
      )}

      {historyMode === 'calendar' && (
        <FurikaeriCalendarView
          year={calendarYear}
          monthIndex={calendarMonth}
          entries={entries}
          todayKey={todayKey}
          onPrevMonth={() => {
            const { y, m } = goPrevMonth(calendarYear, calendarMonth)
            setCalendarYear(y)
            setCalendarMonth(m)
          }}
          onNextMonth={() => {
            const { y, m } = goNextMonth(calendarYear, calendarMonth)
            setCalendarYear(y)
            setCalendarMonth(m)
          }}
          onSelectDate={(dk) => {
            const ent = entries[dk]
            if (ent) onSelect(ent)
          }}
        />
      )}
    </div>
  )
}
