import { useFurikaeri } from '../hooks/useFurikaeri'
import '../components/furikaeri/Furikaeri.css'
import { FurikaeriHeader } from '../components/furikaeri/FurikaeriHeader'
import { FurikaeriWriteView } from '../components/furikaeri/FurikaeriWriteView'
import { FurikaeriHistoryView } from '../components/furikaeri/FurikaeriHistoryView'
import { FurikaeriDetailView } from '../components/furikaeri/FurikaeriDetailView'
import { FurikaeriStatsView } from '../components/furikaeri/FurikaeriStatsView'

export default function FurikaeriPage() {
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
    exportJson,
    exportText,
    importBackupJson,
  } = useFurikaeri()

  const detailEntry = selectedEntry ? entries[selectedEntry.date] ?? selectedEntry : null

  return (
    <div className={`furikaeri-app${fadeIn ? ' furikaeri-app--ready' : ''}`}>
      <FurikaeriHeader view={view} onViewChange={setView} />

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
            historyPage={historyPage}
            totalPages={totalPages}
            pageSize={pageSize}
            setHistoryPage={setHistoryPage}
            historyQuery={historyQuery}
            setHistoryQuery={setHistoryQuery}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            applyDatePreset={applyDatePreset}
            historyTagFilter={historyTagFilter}
            toggleHistoryTagFilter={toggleHistoryTagFilter}
            allTagsInUse={allTagsInUse}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            historyMode={historyMode}
            setHistoryMode={setHistoryMode}
            calendarYear={calendarYear}
            calendarMonth={calendarMonth}
            setCalendarYear={setCalendarYear}
            setCalendarMonth={setCalendarMonth}
            onSelect={openDetail}
            onClearAll={handleClearAll}
            onDeleteOne={handleDeleteOne}
            onTogglePin={togglePin}
            exportJson={exportJson}
            exportText={exportText}
            importBackupJson={importBackupJson}
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
    </div>
  )
}
