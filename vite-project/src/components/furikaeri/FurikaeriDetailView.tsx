import { useState } from 'react'
import { formatDate } from '../../utils/date'
import type { FurikaeriEntry } from '../../types/furikaeri'
import { FURIKAERI_TAG_OPTIONS } from '../../constants/furikaeriTags'
import './Furikaeri.css'

interface FurikaeriDetailViewProps {
  entry: FurikaeriEntry
  onBack: () => void
  onTogglePin: () => void
  onUpdateTags: (tags: string[]) => void
}

export function FurikaeriDetailView({
  entry,
  onBack,
  onTogglePin,
  onUpdateTags,
}: FurikaeriDetailViewProps) {
  const [customTag, setCustomTag] = useState('')
  const tags = entry.tags ?? []
  const allOptions = [...new Set([...FURIKAERI_TAG_OPTIONS, ...tags])].sort()

  const toggleTag = (tag: string) => {
    const has = tags.includes(tag)
    onUpdateTags(has ? tags.filter((t) => t !== tag) : [...tags, tag])
  }

  const addCustom = () => {
    const t = customTag.trim()
    if (!t || tags.includes(t)) {
      setCustomTag('')
      return
    }
    onUpdateTags([...tags, t])
    setCustomTag('')
  }

  return (
    <div className="furikaeri-detail">
      <button type="button" className="furikaeri-back-btn" onClick={onBack}>
        ← 履歴に戻る
      </button>
      <div className="furikaeri-detail-head">
        <p className="furikaeri-date-label">{formatDate(entry.date)}</p>
        <button
          type="button"
          className="furikaeri-detail-pin"
          onClick={onTogglePin}
          aria-label={entry.pinned ? 'ピンを外す' : 'ピン留めする'}
        >
          {entry.pinned ? '★ ピン留め中' : '☆ ピン留め'}
        </button>
      </div>

      <div className="furikaeri-detail-tags-edit">
        <span className="furikaeri-tags-label">タグ</span>
        <div className="furikaeri-tags-row">
          {allOptions.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`furikaeri-tag-chip ${tags.includes(tag) ? 'on' : ''}`}
              onClick={() => toggleTag(tag)}
              aria-pressed={tags.includes(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="furikaeri-custom-tag-row">
          <input
            type="text"
            className="furikaeri-custom-tag-input"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            placeholder="タグを追加"
            maxLength={32}
          />
          <button type="button" className="furikaeri-custom-tag-add" onClick={addCustom}>
            追加
          </button>
        </div>
      </div>

      <div className="furikaeri-detail-block">
        <div className="furikaeri-detail-label">
          <span>出来事</span>
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
