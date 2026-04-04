import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
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
  upsertTodayDraft,
  upsertTodayEntry,
} from '../utils/furikaeriStorage'
import { analyzeFurikaeri } from '../api/furikaeriClient'
import { useSpeechRecognition } from './useSpeechRecognition'
import { filterSortedDates, type HistoryFilterOptions } from '../utils/furikaeriFilters'
import { downloadFurikaeriText } from '../utils/furikaeriExport'
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
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())

  const todayKey = getTodayKey()
  const formRef = useRef(form)
  formRef.current = form
  const todayKeyRef = useRef(todayKey)
  todayKeyRef.current = todayKey
  const recordingBaseRef = useRef<string>('')
  const aiSourceEventsRef = useRef<string | null>(null)
  const analyzeSeqRef = useRef(0)
  const analyzeAbortRef = useRef<AbortController | null>(null)

  const [storageError, setStorageError] = useState<string | null>(null)

  const schedulePersistNotice = useCallback((persisted: boolean) => {
    Promise.resolve().then(() => {
      setStorageError(
        persisted
          ? null
          : 'ブラウザへの保存に失敗しました。ストレージの空き容量やプライベートモードをご確認ください。',
      )
    })
  }, [])

  const dismissStorageError = useCallback(() => setStorageError(null), [])

  const speech = useSpeechRecognition()
  const speechError = speech.error

  useEffect(() => {
    setFadeIn(true)
  }, [])

  useEffect(() => {
    return () => analyzeAbortRef.current?.abort()
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
      setAiResponse('')
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

  // 出来事テキスト変更を1.5秒後に自動保存（タグ操作・AI分析なしでの消失を防ぐ）
  useEffect(() => {
    const id = setTimeout(() => {
      const tk = todayKeyRef.current
      setEntries((prev) => {
        // 今日の記録がなく入力も空なら新規エントリを作らない
        if (!formRef.current.events && !prev[tk]) return prev
        const out = upsertTodayDraft(prev, tk, formRef.current)
        schedulePersistNotice(out.persisted)
        return out.map
      })
    }, 1500)
    return () => clearTimeout(id)
  }, [form.events, schedulePersistNotice])

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
  }, [historyQuery, dateFrom, dateTo, historyTagFilter, favoritesOnly])

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

  const handleAnalyze = useCallback(async () => {
    const f = formRef.current
    if (!f.events.trim()) return
    analyzeAbortRef.current?.abort()
    const ac = new AbortController()
    analyzeAbortRef.current = ac
    const seq = ++analyzeSeqRef.current
    const snapshot = f.events
    setLoading(true)
    setAiResponse('')
    try {
      const text = await analyzeFurikaeri(f, { signal: ac.signal })
      if (seq !== analyzeSeqRef.current) return
      setAiResponse(text)
      const tk = todayKeyRef.current
      const latest = formRef.current
      setEntries((prev) => {
        const out = upsertTodayEntry(prev, tk, latest, text)
        schedulePersistNotice(out.persisted)
        return out.map
      })
      aiSourceEventsRef.current = snapshot
    } catch (e) {
      if (seq !== analyzeSeqRef.current) return
      if (e instanceof DOMException && e.name === 'AbortError') return
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setAiResponse(`エラーが発生しました: ${msg}`)
      aiSourceEventsRef.current = snapshot
    } finally {
      if (seq === analyzeSeqRef.current) setLoading(false)
    }
  }, [schedulePersistNotice])

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
      let next: FurikaeriForm | undefined
      flushSync(() => {
        setForm((prev) => {
          const has = prev.tags.includes(tag)
          const nextTags = has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
          next = { ...prev, tags: nextTags }
          return next
        })
      })
      if (!next) return
      const draft = next
      const tk = todayKeyRef.current
      setEntries((e) => {
        const out = upsertTodayDraft(e, tk, draft)
        schedulePersistNotice(out.persisted)
        return out.map
      })
    },
    [schedulePersistNotice],
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
  const liveTranscript = speech.transcript

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
      const out = deleteEntryByDate(entries, date)
      setEntries(out.map)
      schedulePersistNotice(out.persisted)
      if (selectedEntry?.date === date) {
        setSelectedEntry(null)
        setView('history')
      }
    },
    [entries, selectedEntry, schedulePersistNotice],
  )

  const handleClearAll = useCallback(() => {
    const ok = clearAllEntries()
    setEntries({})
    schedulePersistNotice(ok)
    if (view === 'history' || view === 'detail') {
      setView('write')
      setSelectedEntry(null)
    }
  }, [view, schedulePersistNotice])

  const togglePin = useCallback(
    (date: string) => {
      const e = entries[date]
      if (!e) return
      const out = patchEntry(entries, date, { pinned: !e.pinned })
      setEntries(out.map)
      schedulePersistNotice(out.persisted)
      setSelectedEntry((prev) => (prev?.date === date ? out.map[date] : prev))
    },
    [entries, schedulePersistNotice],
  )

  const updateEntryTags = useCallback(
    (date: string, tags: string[]) => {
      const uniq = [...new Set(tags.filter(Boolean))]
      const out = patchEntry(entries, date, { tags: uniq.length ? uniq : undefined })
      setEntries(out.map)
      schedulePersistNotice(out.persisted)
      setSelectedEntry((prev) => (prev?.date === date ? out.map[date] : prev))
    },
    [entries, schedulePersistNotice],
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

  const exportText = useCallback(() => downloadFurikaeriText(entries), [entries])

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
    exportText,
    isVoiceSupported,
    isListening,
    liveTranscript,
    speechError,
    startVoiceInput,
    stopVoiceInput,
    storageError,
    dismissStorageError,
  }
}
