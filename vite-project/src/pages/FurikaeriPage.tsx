import { useState, useCallback } from 'react'
import { useFurikaeri } from '../hooks/useFurikaeri'
import '../components/furikaeri/Furikaeri.css'
import { FurikaeriHeader } from '../components/furikaeri/FurikaeriHeader'
import { FurikaeriWriteView } from '../components/furikaeri/FurikaeriWriteView'
import { FurikaeriHistoryView } from '../components/furikaeri/FurikaeriHistoryView'
import { FurikaeriDetailView } from '../components/furikaeri/FurikaeriDetailView'
import { FurikaeriStatsView } from '../components/furikaeri/FurikaeriStatsView'
import { ConfirmDialog } from '../components/furikaeri/ConfirmDialog'

type ConfirmState = { message: string; confirmLabel: string; onConfirm: () => void }

export default function FurikaeriPage() {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const {
    view,
    setView,
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
    historyPage,
    setHistoryPage,
    totalPages,
    totalFiltered,
    pageSize,
    historyMode,
    setHistoryMode,
    calendarYear,
    calendarMonth,
    setCalendarYear,
    setCalendarMonth,
    handleAnalyze,
    openDetail,
    goBackToHistory,
    isVoiceSupported,
    isListening,
    liveTranscript,
    speechError,
    startVoiceInput,
    stopVoiceInput,
    handleClearAll,
    handleDeleteOne,
    togglePin,
    updateEntryTags,
    exportText,
    storageError,
    dismissStorageError,
  } = useFurikaeri()

  const detailEntry = selectedEntry ? entries[selectedEntry.date] ?? selectedEntry : null

  const requestDeleteOne = useCallback((date: string) => {
    setConfirmState({
      message: 'この1件の記録を削除しますか？',
      confirmLabel: '削除する',
      onConfirm: () => {
        handleDeleteOne(date)
        setConfirmState(null)
      },
    })
  }, [handleDeleteOne])

  const requestClearAll = useCallback(() => {
    setConfirmState({
      message: 'すべての履歴を消去しますか？この操作は元に戻せません。',
      confirmLabel: '全消去する',
      onConfirm: () => {
        handleClearAll()
        setConfirmState(null)
      },
    })
  }, [handleClearAll])

  return (
    <div className={`furikaeri-app${fadeIn ? ' furikaeri-app--ready' : ''}`}>
      <FurikaeriHeader view={view} onViewChange={setView} />

      {storageError && (
        <div className="furikaeri-storage-banner" role="alert">
          <div className="furikaeri-storage-banner-inner">
            <p>{storageError}</p>
            <button type="button" className="furikaeri-storage-banner-dismiss" onClick={dismissStorageError}>
              閉じる
            </button>
          </div>
        </div>
      )}

      <main className="furikaeri-main">
        {view === 'write' && (
          <FurikaeriWriteView
            todayKey={todayKey}
            form={form}
            setFormField={setFormField}
            onToggleTag={toggleFormTag}
            aiResponse={aiResponse}
            showAiReflection={showAiReflection}
            loading={loading}
            onAnalyze={handleAnalyze}
            isVoiceSupported={isVoiceSupported}
            isListening={isListening}
            liveTranscript={liveTranscript}
            speechError={speechError}
            onStartVoice={startVoiceInput}
            onStopVoice={stopVoiceInput}
          />
        )}

        {view === 'history' && (
          <FurikaeriHistoryView
            entries={entries}
            todayKey={todayKey}
            paginatedDates={paginatedDates}
            totalFiltered={totalFiltered}
            filterProps={{
              historyQuery,
              setHistoryQuery,
              dateFrom,
              dateTo,
              setDateFrom,
              setDateTo,
              applyDatePreset,
              historyTagFilter,
              toggleHistoryTagFilter,
              allTagsInUse,
              favoritesOnly,
              setFavoritesOnly,
            }}
            paginationProps={{
              historyPage,
              totalPages,
              pageSize,
              setHistoryPage,
            }}
            displayProps={{
              historyMode,
              setHistoryMode,
              calendarYear,
              calendarMonth,
              setCalendarYear,
              setCalendarMonth,
            }}
            onSelect={openDetail}
            onClearAll={requestClearAll}
            onDeleteOne={requestDeleteOne}
            onTogglePin={togglePin}
            exportText={exportText}
          />
        )}

        {view === 'detail' && detailEntry && (
          <FurikaeriDetailView
            entry={detailEntry}
            onBack={goBackToHistory}
            onTogglePin={() => togglePin(detailEntry.date)}
            onUpdateTags={(tags) => updateEntryTags(detailEntry.date, tags)}
          />
        )}

        {view === 'stats' && <FurikaeriStatsView entries={entries} />}
      </main>

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}
