import { useFurikaeri } from '../hooks/useFurikaeri'
import { FurikaeriHeader } from '../components/furikaeri/FurikaeriHeader'
import { FurikaeriWriteView } from '../components/furikaeri/FurikaeriWriteView'
import { FurikaeriHistoryView } from '../components/furikaeri/FurikaeriHistoryView'
import { FurikaeriDetailView } from '../components/furikaeri/FurikaeriDetailView'

export default function FurikaeriPage() {
  const {
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
    isVoiceSupported,
    isListening,
    liveTranscript,
    speechError,
    startVoiceInput,
    stopVoiceInput,
    handleClearAll,
    handleDeleteOne,
  } = useFurikaeri()

  return (
    <div
      className="furikaeri-app"
      style={{
        fontFamily: "'Hiragino Mincho ProN', Georgia, serif",
        minHeight: '100vh',
        background: '#fff1f6',
        color: '#2C2C2C',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}
    >
      <FurikaeriHeader view={view} onViewChange={setView} />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px' }}>
        {view === 'write' && (
          <FurikaeriWriteView
            todayKey={todayKey}
            form={form}
            setFormField={setFormField}
            aiResponse={aiResponse}
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
            sortedDates={sortedDates}
            entries={entries}
            todayKey={todayKey}
            onSelect={openDetail}
            onClearAll={handleClearAll}
            onDeleteOne={handleDeleteOne}
          />
        )}

        {view === 'detail' && selectedEntry && (
          <FurikaeriDetailView entry={selectedEntry} onBack={goBackToHistory} />
        )}
      </main>
    </div>
  )
}
