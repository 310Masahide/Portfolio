import type { FurikaeriEntriesMap } from '../../types/furikaeri'
import {
  computeStreak,
  recordsPerWeek,
  wordFrequencies,
  totalEntryCount,
} from '../../utils/furikaeriStats'
import './Furikaeri.css'

interface FurikaeriStatsViewProps {
  entries: FurikaeriEntriesMap
}

export function FurikaeriStatsView({ entries }: FurikaeriStatsViewProps) {
  const total = totalEntryCount(entries)
  const streak = computeStreak(entries)
  const weeks = recordsPerWeek(entries, 8)
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count))
  const words = wordFrequencies(entries, 24)
  const maxWord = Math.max(1, ...words.map((w) => w.count))

  return (
    <div className="furikaeri-stats">
      <h2 className="furikaeri-stats-title">記録の統計</h2>
      <p className="furikaeri-stats-lead">記録が増えるほど傾向が見えやすくなります。</p>

      <div className="furikaeri-stats-cards">
        <div className="furikaeri-stats-card">
          <div className="furikaeri-stats-card-label">総記録数</div>
          <div className="furikaeri-stats-card-value">{total}</div>
          <div className="furikaeri-stats-card-unit">件</div>
        </div>
        <div className="furikaeri-stats-card">
          <div className="furikaeri-stats-card-label">連続記録（ストリーク）</div>
          <div className="furikaeri-stats-card-value">{streak}</div>
          <div className="furikaeri-stats-card-unit">日</div>
        </div>
      </div>

      <section className="furikaeri-stats-section">
        <h3 className="furikaeri-stats-h3">直近8週の記録日数</h3>
        {total === 0 ? (
          <p className="furikaeri-stats-empty">まだデータがありません</p>
        ) : (
          <div className="furikaeri-stats-chart" role="img" aria-label="週ごとの記録日数の棒グラフ">
            {weeks.map((w) => (
              <div key={w.label} className="furikaeri-stats-bar-wrap">
                <div
                  className="furikaeri-stats-bar"
                  style={{ height: `${(w.count / maxWeek) * 100}%` }}
                  title={`${w.label} ${w.count}日`}
                />
                <span className="furikaeri-stats-bar-label">{w.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="furikaeri-stats-section">
        <h3 className="furikaeri-stats-h3">よく出る語（簡易）</h3>
        <p className="furikaeri-stats-note">区切り文字で分割した出現回数です。参考程度にご利用ください。</p>
        {words.length === 0 ? (
          <p className="furikaeri-stats-empty">まだデータがありません</p>
        ) : (
          <div className="furikaeri-stats-cloud">
            {words.map((w) => (
              <span
                key={w.word}
                className="furikaeri-stats-cloud-word"
                style={{
                  fontSize: `${12 + (w.count / maxWord) * 14}px`,
                  opacity: 0.5 + (w.count / maxWord) * 0.5,
                }}
              >
                {w.word}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
