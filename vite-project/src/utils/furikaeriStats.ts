import type { FurikaeriEntriesMap } from '../types/furikaeri'
import { toDateKey } from './dateRanges'

/** 今日を終点とする連続記録日数（今日未記録なら昨日から遡る） */
export function computeStreak(entries: FurikaeriEntriesMap): number {
  const set = new Set(Object.keys(entries))
  if (set.size === 0) return 0
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const key = toDateKey(d)
    if (set.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else if (streak === 0 && i === 0) {
      // 今日まだ書いていない → 昨日から試す
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

/** 直近 `weeks` 週の各週の記録件数（古い→新しい） */
export function recordsPerWeek(entries: FurikaeriEntriesMap, weeks: number): { label: string; count: number }[] {
  const set = new Set(Object.keys(entries))
  const out: { label: string; count: number }[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now)
    end.setDate(end.getDate() - w * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    let count = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (set.has(toDateKey(d))) count++
    }
    const label = `${start.getMonth() + 1}/${start.getDate()}〜`
    out.push({ label, count })
  }
  return out
}

/** 日本語の助詞・助動詞・頻出機能語（ノイズになりやすい語） */
const JP_STOPWORDS = new Set([
  'ある', 'いる', 'する', 'なる', 'できる', 'いく', 'くる', 'おく', 'みる', 'しまう',
  'ない', 'ます', 'です', 'でした', 'ました', 'だった', 'だろう', 'でしょう',
  'から', 'まで', 'より', 'ので', 'のに', 'ため', 'ように', 'として', 'について',
  'という', 'といった', 'そして', 'しかし', 'ただし', 'また', 'さらに', 'なお',
  'それ', 'これ', 'あれ', 'この', 'その', 'あの', 'どの', 'ここ', 'そこ', 'あそこ',
  'もの', 'こと', 'とき', 'ところ', 'わたし', '自分', 'みんな',
])

/** 簡易トークン化（日本語は区切りで分割、2文字以上・ストップワード除外） */
export function wordFrequencies(entries: FurikaeriEntriesMap, topN: number): { word: string; count: number }[] {
  const text = Object.values(entries)
    .map((e) => `${e.events ?? ''} ${e.aiResponse ?? ''}`)
    .join('\n')
  const tokens = text
    .split(/[\s\n、,，.。!！?？「」『』【】（）()…・\-—/\\|：:；;]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
  const map = new Map<string, number>()
  for (const t of tokens) {
    const k = t.toLowerCase()
    if (JP_STOPWORDS.has(k)) continue
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }))
}

export function totalEntryCount(entries: FurikaeriEntriesMap): number {
  return Object.keys(entries).length
}
