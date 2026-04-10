export interface FurikaeriEntry {
  date: string
  /** その日の出来事（箇条書き・自由記述） */
  events?: string
  aiResponse?: string
  /** ピン留め（履歴で優先表示・フィルタ） */
  pinned?: boolean
  /** 分類タグ */
  tags?: string[]
}

export type FurikaeriEntriesMap = Record<string, FurikaeriEntry>

export type FurikaeriView = 'write' | 'history' | 'detail' | 'stats'

export interface FurikaeriForm {
  events: string
  tags: string[]
}

export type HistoryDisplayMode = 'list' | 'calendar'
