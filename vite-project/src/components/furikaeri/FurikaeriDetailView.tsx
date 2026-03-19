import { formatDate } from '../../utils/date'
import type { FurikaeriEntry } from '../../types/furikaeri'
import './Furikaeri.css'

interface FurikaeriDetailViewProps {
  entry: FurikaeriEntry
  onBack: () => void
}

export function FurikaeriDetailView({ entry, onBack }: FurikaeriDetailViewProps) {
  return (
    <div className="furikaeri-detail">
      <button type="button" className="furikaeri-back-btn" onClick={onBack}>
        ← 履歴に戻る
      </button>
      <p className="furikaeri-date-label">{formatDate(entry.date)}</p>

      <div className="furikaeri-detail-block">
        <div className="furikaeri-detail-label">
          <span>今日は何がありましたか？</span>
        </div>
        <p className="furikaeri-detail-content" style={{ background: '#fff' }}>
          {entry.events || '（未入力）'}
        </p>
      </div>

      {entry.aiResponse && (
        <div className="furikaeri-ai-block furikaeri-ai-block-detail">
          <div className="furikaeri-ai-label">AI Reflection</div>
          <p className="furikaeri-ai-text">{entry.aiResponse}</p>
        </div>
      )}
    </div>
  )
}
