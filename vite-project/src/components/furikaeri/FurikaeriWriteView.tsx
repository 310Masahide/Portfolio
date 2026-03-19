import type { FurikaeriForm } from '../../types/furikaeri'
import { formatDate } from '../../utils/date'
import './Furikaeri.css'

interface FurikaeriWriteViewProps {
  todayKey: string
  form: FurikaeriForm
  setFormField: <K extends keyof FurikaeriForm>(key: K, value: string) => void
  aiResponse: string
  loading: boolean
  onAnalyze: () => void
  isVoiceSupported: boolean
  isListening: boolean
  liveTranscript: string
  speechError: string | null
  onStartVoice: () => void
  onStopVoice: () => void
}

export function FurikaeriWriteView({
  todayKey,
  form,
  setFormField,
  aiResponse,
  loading,
  onAnalyze,
  isVoiceSupported,
  isListening,
  liveTranscript,
  speechError,
  onStartVoice,
  onStopVoice,
}: FurikaeriWriteViewProps) {
  const hasContent = Boolean(form.events)

  return (
    <div className="furikaeri-write">
      <p className="furikaeri-date-label">{formatDate(todayKey)}</p>

      <div className="furikaeri-field">
        <div className="furikaeri-field-header">
          <label className="furikaeri-field-label">
            <span className="furikaeri-field-name">今日は何がありましたか？</span>
          </label>

          {isVoiceSupported && (
            <div className="furikaeri-voice-inline">
              {!isListening ? (
                <button
                  type="button"
                  className="furikaeri-voice-btn icon"
                  onClick={onStartVoice}
                  aria-label="音声入力を開始"
                  title="音声入力を開始"
                >
                  <svg
                    className="furikaeri-voice-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="furikaeri-voice-btn icon stop"
                  onClick={onStopVoice}
                  aria-label="音声入力を停止"
                  title="音声入力を停止"
                >
                  <svg
                    className="furikaeri-voice-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M7 7h10v10H7z" fill="currentColor" />
                  </svg>
                </button>
              )}

              {isListening && (
                <span className="furikaeri-voice-status">聞き取り中…</span>
              )}
            </div>
          )}
        </div>

        {speechError && <div className="furikaeri-voice-error">{speechError}</div>}

        <textarea
          className="furikaeri-textarea"
          data-filled={Boolean(form.events)}
          value={form.events}
          onChange={(e) => setFormField('events', e.target.value)}
          placeholder={'例）\n- 仕事でミスして落ち込んだ\n- 夕方に散歩して少し回復した\n- 明日は朝イチで優先タスクから着手する'}
          rows={8}
        />

        {isListening && liveTranscript.trim() && (
          <div className="furikaeri-voice-preview">
            <div className="furikaeri-voice-preview-label">音声入力（プレビュー）</div>
            <div className="furikaeri-voice-preview-text">{liveTranscript}</div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="furikaeri-analyze-btn"
        onClick={onAnalyze}
        disabled={loading || !hasContent}
      >
        {loading ? 'AIが振り返っています…' : 'AIに俯瞰してもらう'}
      </button>

      {aiResponse && (
        <div className="furikaeri-ai-block">
          <div className="furikaeri-ai-label">AI Reflection</div>
          <p className="furikaeri-ai-text">{aiResponse}</p>
        </div>
      )}
    </div>
  )
}
