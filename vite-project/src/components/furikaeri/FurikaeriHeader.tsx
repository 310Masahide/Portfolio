import type { FurikaeriView } from '../../types/furikaeri'
import './Furikaeri.css'

interface FurikaeriHeaderProps {
  view: FurikaeriView
  onViewChange: (v: FurikaeriView) => void
}

const tabs: [FurikaeriView, string][] = [
  ['write', '今日'],
  ['history', '履歴'],
]

export function FurikaeriHeader({ view, onViewChange }: FurikaeriHeaderProps) {
  return (
    <header className="furikaeri-header">
      <div className="furikaeri-header-inner">
        <div>
          <div className="furikaeri-header-label">Daily Reflection</div>
          <h1 className="furikaeri-title">振り返り</h1>
        </div>
        <nav className="furikaeri-nav">
          {tabs.map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={`furikaeri-tab furikaeri-tab-${v} ${view === v ? 'active' : ''}`}
              onClick={() => onViewChange(v)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
