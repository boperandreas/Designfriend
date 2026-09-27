import { useEffect, useRef, useState } from 'react'
import { combine, felText, type ResultLike } from '../lib/diktering'

// The Web Speech API is not in TypeScript's DOM types everywhere, so it is
// described here as far as we use it.
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ResultLike> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface Props {
  text: string
  onText: (t: string) => void
  onFel: (msg: string | null) => void
  disabled?: boolean
  /** Increment to abort a running dictation, for example when the message is sent. */
  avbryt: number
}

/** Microphone button: speech becomes text in the message field, in Swedish. */
export function Diktera({ text, onText, onFel, disabled, avbryt }: Props) {
  const [lyssnar, setLyssnar] = useState(false)
  const [tips, setTips] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => () => rec.current?.abort(), [])

  useEffect(() => {
    if (!rec.current) return
    rec.current.onresult = null
    rec.current.abort()
  }, [avbryt])

  function start() {
    const Ctor = recognitionCtor()
    if (!Ctor) { setTips((t) => !t); return }
    const r = new Ctor()
    r.lang = 'sv-SE'
    r.continuous = true
    r.interimResults = true
    const base = textRef.current
    r.onresult = (e) => onText(combine(base, e.results))
    r.onerror = (e) => { const m = felText(e.error); if (m) onFel(m) }
    r.onend = () => { setLyssnar(false); rec.current = null }
    try {
      r.start()
      rec.current = r
      setLyssnar(true)
      onFel(null)
    } catch {
      onFel(felText('unknown'))
    }
  }

  function stop() {
    rec.current?.stop()
  }

  return (
    <>
      <button
        type="button"
        className={`mic${lyssnar ? ' lyssnar' : ''}`}
        onClick={lyssnar ? stop : start}
        disabled={disabled && !lyssnar}
        aria-pressed={lyssnar}
        aria-label={lyssnar ? 'Sluta diktera' : 'Diktera'}
        title={lyssnar ? 'Sluta diktera' : 'Diktera'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
      {tips && (
        <p className="dikt-tips" role="note">
          Den här webbläsaren kan inte diktera i appen. Tryck på mikrofonen på tangentbordet i stället.
        </p>
      )}
    </>
  )
}
