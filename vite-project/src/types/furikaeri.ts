export interface FurikaeriEntry {
  date: string
  /** その日の出来事（箇条書き・自由記述） */
  events?: string
  aiResponse?: string
}

export type FurikaeriEntriesMap = Record<string, FurikaeriEntry>

export type FurikaeriView = 'write' | 'history' | 'detail'

export interface FurikaeriForm {
  events: string
}
