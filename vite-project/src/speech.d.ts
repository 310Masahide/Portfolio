/** Web Speech API (音声認識) の最小限の型定義 */

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent
  error: SpeechRecognitionErrorEvent
  end: Event
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message?: string
}

declare var SpeechRecognition: SpeechRecognitionStatic
declare var webkitSpeechRecognition: SpeechRecognitionStatic

