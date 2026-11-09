import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square } from 'lucide-react'
import { transcribeDictation } from '@/api/assistant'
import { Button } from '@/components/ui/button'
import { useBook } from '@/hooks/useBook'
import { startLiveTranscription, type LiveTranscriber } from '@/lib/speech-recognition'
import {
  MAX_RECORDING_SEC,
  MIN_RECORDING_MS,
  formatClock,
  micErrorMessage,
  pickRecorderMime,
  recordingFilename,
} from '@/lib/voice-recording'
import { cn } from '@/lib/utils'

/**
 * step8: speak into a chat and get text — the mic button on every `ChatPanel`. A copy of
 * the internal app's `DictateButton`: the recording goes to `POST /api/assistant/transcribe`
 * and its text is handed to `onText` ONCE, at the end (the caller appends it to the draft,
 * the customer reads it and presses Send). While recording, the browser's own speech engine
 * shows what it hears in a strip above the button; if the server hears nothing (or fails),
 * what the browser heard is used instead.
 *
 * ⚠️ The microphone is released on stop, on error AND on unmount — a live track leaves the
 * browser's recording indicator on.
 */
export function DictateButton({
  onText,
  disabled,
  autoStart = false,
}: {
  onText: (text: string) => void
  disabled?: boolean
  /** step2 (2026-11-09): start recording as soon as it shows (the chat bubble's "Dictate"). */
  autoStart?: boolean
}) {
  const book = useBook()
  const [phase, setPhase] = useState<'idle' | 'recording' | 'working'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [liveText, setLiveText] = useState('')

  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<BlobPart[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const live = useRef<LiveTranscriber | null>(null)
  /** Wall clock, not ticks: a background tab fires the interval far less than once a second. */
  const startedAt = useRef(0)
  /** The live text as of stop, read in `send` without waiting for a re-render. */
  const liveTextRef = useRef('')

  const release = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    live.current?.stop()
    live.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    recorder.current = null
  }

  useEffect(() => release, [])

  // Once only (StrictMode mounts twice in dev; a second start would open the mic twice).
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!autoStart || autoStarted.current) return
    autoStarted.current = true
    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  // A mic error or "nothing was picked up" is a passing note, not a state.
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 6000)
    return () => clearTimeout(t)
  }, [error])

  const send = async (blob: Blob, filename: string, heldFor: number) => {
    // A sub-second, near-silent clip is what makes a speech model answer with boilerplate.
    if (heldFor < MIN_RECORDING_MS) {
      setPhase('idle')
      setLiveText('')
      setError('That was too short — hold it while you speak.')
      return
    }
    setPhase('working')
    const heard = liveTextRef.current.trim()
    try {
      const { text } = await transcribeDictation(book.auth, blob, filename)
      const final = text.trim()
      if (final) onText(final)
      else if (heard) onText(heard)
      else setError('Nothing was picked up. Try again a little closer to the mic.')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'That recording could not be turned into text.')
      // The request failed; the customer's sentence should not be thrown away with it.
      if (heard) onText(heard)
    } finally {
      setPhase('idle')
      setLiveText('')
      liveTextRef.current = ''
    }
  }

  const start = async () => {
    setError(null)
    setLiveText('')
    liveTextRef.current = ''
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      stream.current = media
      const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m))
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data)
      }
      rec.onstop = () => {
        const type = rec.mimeType || mime || 'audio/webm'
        const blob = new Blob(chunks.current, { type })
        const heldFor = Date.now() - startedAt.current
        release()
        void send(blob, recordingFilename(type), heldFor)
      }
      recorder.current = rec
      rec.start()
      startedAt.current = Date.now()
      setElapsed(0)
      setPhase('recording')

      // Advisory, started AFTER the recorder: the upload is the real output.
      live.current = startLiveTranscription((text) => {
        liveTextRef.current = text
        setLiveText(text)
      })

      timer.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsed(secs)
        if (secs >= MAX_RECORDING_SEC) rec.stop()
      }, 250)
    } catch (err) {
      release()
      setPhase('idle')
      setError(micErrorMessage(err))
    }
  }

  // No recorder in this browser: no button rather than one that cannot work.
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) return null

  const recording = phase === 'recording'
  return (
    <div className="relative shrink-0">
      {(error || (recording && liveText)) && (
        <div
          aria-live="polite"
          className={cn(
            'absolute bottom-full left-0 z-10 mb-2 max-h-24 w-64 overflow-y-auto rounded-lg px-2.5 py-1.5 text-xs shadow-sm ring-1',
            error ? 'bg-white text-destructive ring-red-200' : 'bg-red-50 text-muted-foreground ring-red-200',
          )}
        >
          {error ?? (
            <span className="flex items-start gap-1.5">
              <span aria-hidden className="mt-1 size-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
              <span className="min-w-0 break-words">{liveText}</span>
            </span>
          )}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size={recording ? 'default' : 'icon'}
        title={recording ? 'Stop and insert the text' : 'Speak your message'}
        aria-label={recording ? 'Stop dictating' : 'Speak your message'}
        disabled={disabled || phase === 'working'}
        onClick={() => {
          if (recording) recorder.current?.stop()
          else if (phase === 'idle') void start()
        }}
        className={cn(
          'h-11 shrink-0',
          recording ? 'gap-1.5 border-red-300 bg-red-50 px-3 text-red-700 hover:bg-red-100' : 'w-11',
        )}
      >
        {phase === 'working' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : recording ? (
          <>
            <Square className="size-3.5" /> {formatClock(elapsed)}
          </>
        ) : (
          <Mic className="size-4" />
        )}
      </Button>
    </div>
  )
}
