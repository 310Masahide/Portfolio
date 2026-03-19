import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { FurikaeriEntriesMap, FurikaeriEntry, FurikaeriForm, FurikaeriView } from '../types/furikaeri'
import { getTodayKey } from '../utils/date'
import { clearAllEntries, deleteEntryByDate, loadFurikaeriEntries, upsertTodayEntry } from '../utils/furikaeriStorage'
import { analyzeFurikaeri } from '../api/furikaeriClient'
import { useSpeechRecognition } from './useSpeechRecognition'

const initialForm: FurikaeriForm = { events: '' }

export function useFurikaeri() {
  const [view, setView] = useState<FurikaeriView>('write')
  const [entries, setEntries] = useState<FurikaeriEntriesMap>(() => loadFurikaeriEntries())
  const [form, setForm] = useState<FurikaeriForm>(initialForm)
  const [aiResponse, setAiResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FurikaeriEntry | null>(null)
  const [fadeIn, setFadeIn] = useState(false)

  const todayKey = getTodayKey()
  const recordingBaseRef = useRef<string>('')

  const speech = useSpeechRecognition()
  const speechError = speech.error


  useEffect(() => {
    setFadeIn(true)
  }, [])

  useEffect(() => {
    const today = entries[todayKey]
    if (today) {
      setForm({ events: today.events ?? '' })
      setAiResponse(today.aiResponse ?? '')
    }
  }, [entries, todayKey])

  // 音声認識中は transcript を events に反映（元の入力は recordingBaseRef に保持）
  useEffect(() => {
    if (!speech.isListening) return
    const base = recordingBaseRef.current.trim()
    const t = speech.transcript.trim()
    const merged = base ? (t ? `${base}\n${t}` : base) : t
    setForm({ events: merged })
  }, [speech.isListening, speech.transcript])

  const saveEntry = useCallback(
    (aiRes: string) => {
      const updated = upsertTodayEntry(entries, todayKey, form, aiRes)
      setEntries(updated)
    },
    [entries, todayKey, form]
  )

  const handleAnalyze = useCallback(async () => {
    if (!form.events) return
    setLoading(true)
    setAiResponse('')
    try {
      const text = await analyzeFurikaeri(form)
      setAiResponse(text)
      saveEntry(text)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setAiResponse(`エラーが発生しました: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [form, saveEntry])

  const sortedDates = Object.keys(entries).sort((a, b) => b.localeCompare(a))

  const setFormField = useCallback(<K extends keyof FurikaeriForm>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

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

  return {
    view,
    setView,
    entries,
    form,
    setFormField,
    aiResponse,
    loading,
    selectedEntry,
    fadeIn,
    todayKey,
    sortedDates,
    handleAnalyze,
    openDetail,
    goBackToHistory,
    handleDeleteOne,
    handleClearAll,
    // speech
    isVoiceSupported,
    isListening,
    liveTranscript,
    speechError,
    startVoiceInput,
    stopVoiceInput,
  }
}
