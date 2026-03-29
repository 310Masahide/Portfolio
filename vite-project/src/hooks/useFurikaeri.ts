import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type {
  FurikaeriEntriesMap,
  FurikaeriEntry,
  FurikaeriForm,
  FurikaeriView,
  HistoryDisplayMode,
} from '../types/furikaeri'
import { getTodayKey } from '../utils/date'
import {
  clearAllEntries,
  deleteEntryByDate,
  loadFurikaeriEntries,
  patchEntry,
  saveFurikaeriEntries,
  upsertTodayDraft,
  upsertTodayEntry,
} from '../utils/furikaeriStorage'
import { analyzeFurikaeri } from '../api/furikaeriClient'
import { useSpeechRecognition } from './useSpeechRecognition'
import { filterSortedDates, type HistoryFilterOptions } from '../utils/furikaeriFilters'
import {
  downloadFurikaeriBackup,
  downloadFurikaeriText,
  mergeImportedEntries,
} from '../utils/furikaeriExport'
import { presetRange } from '../utils/dateRanges'

const initialForm: FurikaeriForm = { events: '', tags: [] }

const PAGE_SIZE = 15

export function useFurikaeri() {
  const [view, setView] = useState<FurikaeriView>('write')
  const [entries, setEntries] = useState<FurikaeriEntriesMap>(() => loadFurikaeriEntries())
  const [form, setForm] = useState<FurikaeriForm>(initialForm)
  const [aiResponse, setAiResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FurikaeriEntry | null>(null)
  const [fadeIn, setFadeIn] = useState(false)

  const [historyQuery, setHistoryQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [historyTagFilter, setHistoryTagFilter] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyMode, setHistoryMode] = useState<HistoryDisplayMode>('list')
  const now = new Date()
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth())

  const todayKey = getTodayKey()
  const recordingBaseRef = useRef<string>('')
  const aiSourceEventsRef = useRef<string | null>(null)

  const speech = useSpeechRecognition()
  const speechError = speech.error

  useEffect(() => {
    setFadeIn(true)
  }, [])

  useEffect(() => {
    const today = entries[todayKey]
    if (today) {
      setForm({
        events: today.events ?? '',
        tags: today.tags ? [...today.tags] : [],
      })
      setAiResponse(today.aiResponse ?? '')
      aiSourceEventsRef.current = today.aiResponse ? (today.events ?? '') : null
    } else {
      setForm(initialForm)
      aiSourceEventsRef.current = null
    }
  }, [entries, todayKey])

  useEffect(() => {
    if (!speech.isListening) return
    const base = recordingBaseRef.current.trim()
    const t = speech.transcript.trim()
    const merged = base ? (t ? `${base}\n${t}` : base) : t
    setForm((prev) => ({ ...prev, events: merged }))
  }, [speech.isListening, speech.transcript])

  const filterOptions: HistoryFilterOptions = useMemo(
    () => ({
      query: historyQuery,
      dateFrom,
      dateTo,
      tagFilter: historyTagFilter,
      favoritesOnly,
    }),
    [historyQuery, dateFrom, dateTo, historyTagFilter, favoritesOnly],
  )

  const filteredSortedDates = useMemo(
    () => filterSortedDates(entries, filterOptions),
    [entries, filterOptions],
  )

  useEffect(() => {
    setHistoryPage(1)
  }, [historyQuery, dateFrom, dateTo, historyTagFilter.join(','), favoritesOnly])

  const totalFiltered = filteredSortedDates.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const safePage = Math.min(historyPage, totalPages)
  const paginatedDates = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSortedDates.slice(start, start + PAGE_SIZE)
  }, [filteredSortedDates, safePage])

  const allTagsInUse = useMemo(() => {
    const s = new Set<string>()
    for (const e of Object.values(entries)) {
      for (const t of e.tags ?? []) s.add(t)
    }
    return [...s].sort()
  }, [entries])

  const saveEntry = useCallback(
    (aiRes: string) => {
      const updated = upsertTodayEntry(entries, todayKey, form, aiRes)
      setEntries(updated)
    },
    [entries, todayKey, form],
  )

  const handleAnalyze = useCallback(async () => {
    if (!form.events.trim()) return
    const snapshot = form.events
    setLoading(true)
    setAiResponse('')
    try {
      const text = await analyzeFurikaeri(form)
      setAiResponse(text)
      saveEntry(text)
      aiSourceEventsRef.current = snapshot
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setAiResponse(`エラーが発生しました: ${msg}`)
      aiSourceEventsRef.current = snapshot
    } finally {
      setLoading(false)
    }
  }, [form, saveEntry])

  const showAiReflection = useMemo(() => {
    if (!aiResponse) return false
    const src = aiSourceEventsRef.current
    if (src === null) return false
    return form.events.trim() === src.trim()
  }, [aiResponse, form.events])

  const setFormField = useCallback(<K extends keyof FurikaeriForm>(key: K, value: FurikaeriForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleFormTag = useCallback(
    (tag: string) => {
      setForm((prev) => {
        const has = prev.tags.includes(tag)
        const nextTags = has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
        const next = { ...prev, tags: nextTags }
        window.setTimeout(() => {
          setEntries((e) => upsertTodayDraft(e, todayKey, next))
        }, 0)
        return next
      })
    },
    [todayKey],
  )

  const startVoiceInput = useCallback(() => {
    recordingBaseRef.current = form.events ?? ''
    speech.resetTranscript()
    speech.start()
  }, [form.events, speech])

  const stopVoiceInput = useCallback(() => {
    speech.stop()
  }, [speech])

  const isVoiceSupported = speech.isSupported
  const isListening = speech.isListening
  const liveTranscript = useMemo(() => speech.transcript, [speech.transcript])

  const openDetail = useCallback((entry: FurikaeriEntry) => {
    setSelectedEntry(entry)
    setView('detail')
  }, [])

  const goBackToHistory = useCallback(() => {
    setView('history')
    setSelectedEntry(null)
  }, [])

  const handleDeleteOne = useCallback(
    (date: string) => {
      if (!window.confirm('この1件の記録を削除しますか？')) return
      const next = deleteEntryByDate(entries, date)
      setEntries(next)
      if (selectedEntry?.date === date) {
        setSelectedEntry(null)
        setView('history')
      }
    },
    [entries, selectedEntry],
  )

  const handleClearAll = useCallback(() => {
    if (!window.confirm('すべての履歴を消去しますか？この操作は元に戻せません。')) return
    clearAllEntries()
    setEntries({})
    if (view === 'history' || view === 'detail') {
      setView('write')
      setSelectedEntry(null)
    }
  }, [view])

  const togglePin = useCallback(
    (date: string) => {
      const e = entries[date]
      if (!e) return
      const next = patchEntry(entries, date, { pinned: !e.pinned })
      setEntries(next)
      setSelectedEntry((prev) => (prev?.date === date ? next[date] : prev))
    },
    [entries],
  )

  const updateEntryTags = useCallback(
    (date: string, tags: string[]) => {
      const uniq = [...new Set(tags.filter(Boolean))]
      const next = patchEntry(entries, date, { tags: uniq.length ? uniq : undefined })
      setEntries(next)
      setSelectedEntry((prev) => (prev?.date === date ? next[date] : prev))
    },
    [entries],
  )

  const toggleHistoryTagFilter = useCallback((tag: string) => {
    setHistoryTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }, [])

  const applyDatePreset = useCallback((id: Parameters<typeof presetRange>[0]) => {
    const r = presetRange(id)
    if (!r) {
      setDateFrom('')
      setDateTo('')
      return
    }
    setDateFrom(r.from)
    setDateTo(r.to)
  }, [])

  const exportJson = useCallback(() => downloadFurikaeriBackup(entries), [entries])
  const exportText = useCallback(() => downloadFurikaeriText(entries), [entries])

  const importBackupJson = useCallback((text: string): { ok: boolean; error?: string } => {
    let result: { ok: boolean; error?: string } = { ok: false, error: '不明なエラー' }
    setEntries((prev) => {
      const r = mergeImportedEntries(prev, text)
      if (!r.ok) {
        result = { ok: false, error: r.error }
        return prev
      }
      saveFurikaeriEntries(r.entries)
      result = { ok: true }
      return r.entries
    })
    return result
  }, [])

  const setViewWrapped = useCallback((v: FurikaeriView) => {
    setView(v)
    if (v !== 'detail') setSelectedEntry(null)
  }, [])

  return {
    view,
    setView: setViewWrapped,
    entries,
    form,
    setFormField,
    toggleFormTag,
    aiResponse,
    showAiReflection,
    loading,
    selectedEntry,
    fadeIn,
    todayKey,
    paginatedDates,
    historyQuery,
    setHistoryQuery,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    applyDatePreset,
    historyTagFilter,
    toggleHistoryTagFilter,
    favoritesOnly,
    setFavoritesOnly,
    allTagsInUse,
    historyPage: safePage,
    setHistoryPage,
    totalPages,
    totalFiltered,
    pageSize: PAGE_SIZE,
    historyMode,
    setHistoryMode,
    calendarYear,
    calendarMonth,
    setCalendarYear,
    setCalendarMonth,
    handleAnalyze,
    openDetail,
    goBackToHistory,
    handleDeleteOne,
    handleClearAll,
    togglePin,
    updateEntryTags,
    exportJson,
    exportText,
    importBackupJson,
    isVoiceSupported,
    isListening,
    liveTranscript,
    speechError,
    startVoiceInput,
    stopVoiceInput,
  }
}
