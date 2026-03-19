import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  (typeof SpeechRecognition !== 'undefined' || typeof webkitSpeechRecognition !== 'undefined')

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('お使いのブラウザは音声認識に対応していません。（Chrome推奨）')
      return
    }
    setError(null)
    setTranscript('')

    const Recognition =
      (typeof SpeechRecognition !== 'undefined'
        ? SpeechRecognition
        : webkitSpeechRecognition) as SpeechRecognitionStatic

    const recognition = new Recognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = ''
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript
      }
      setTranscript(full)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech') return
      setError(`音声認識エラー: ${e.error}`)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const abort = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  return {
    isSupported: !!SpeechRecognitionAPI,
    isListening,
    transcript,
    error,
    start,
    stop,
    abort,
    resetTranscript,
  }
}

