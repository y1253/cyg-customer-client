import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, CheckCircle2, FileUp, Loader2 } from 'lucide-react'
import {
  ATTACHMENT_ACCEPT,
  fetchPhoneUpload,
  isAcceptedAttachment,
  MAX_ATTACHMENT_BYTES,
  phoneUpload,
} from '@/api/attachments'
import { Progress } from '@/components/ui/progress'

/**
 * step2 (2026-11-11): the page a phone opens from the QR code on the paperclip card — no
 * sign-in; the link (30 minutes) names the customer and the book. Take photos or pick files;
 * each is read and filed under its name like anything else.
 */
export function PhoneUploadPage() {
  const { token = '' } = useParams()
  const [book, setBook] = useState<{ bookName: string; name: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sent, setSent] = useState<string[]>([])
  const camera = useRef<HTMLInputElement>(null)
  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchPhoneUpload(token).then(setBook, (e: Error) => setError(e.message))
  }, [token])

  const send = async (list: FileList | null) => {
    const all = Array.from(list ?? [])
    const ok = all.filter((f) => isAcceptedAttachment(f) && f.size <= MAX_ATTACHMENT_BYTES)
    if (!ok.length) {
      if (all.length) setError('Those files cannot be read — send photos, PDFs, audio or spreadsheets under 25 MB.')
      return
    }
    setError(null)
    setBusy(true)
    setProgress(0)
    try {
      const rows = await phoneUpload(token, ok, setProgress)
      setSent((s) => [...rows.map((r) => r.filename), ...s])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F7F7] px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">CYG Finance</p>
          <h1 className="mt-1 text-2xl font-bold text-[#0B1C2C]">Send your documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {book
              ? `They go to ${book.bookName}${book.name ? `, under ${book.name}` : ''} — we read each one and file it.`
              : error
                ? ''
                : 'Loading…'}
          </p>
        </div>

        {book && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => camera.current?.click()}
              className="flex flex-col items-center gap-3 rounded-2xl bg-brand px-6 py-10 text-white shadow-lg active:scale-[0.99] disabled:opacity-70"
            >
              {busy ? <Loader2 className="size-10 animate-spin" /> : <Camera className="size-10" />}
              <span className="text-lg font-semibold">{busy ? 'Sending…' : 'Take a photo'}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-medium text-[#0B1C2C] ring-1 ring-black/10 disabled:opacity-70"
            >
              <FileUp className="size-5 text-brand" /> Choose files
            </button>
            <input
              ref={camera}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void send(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={picker}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                void send(e.target.files)
                e.target.value = ''
              }}
            />
            {busy && <Progress value={Math.round(progress * 100)} className="h-1.5" />}
          </>
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>}

        {sent.length > 0 && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <p className="mb-2 text-sm font-semibold text-[#0B1C2C]">
              Sent · {sent.length} — you can see them on your computer
            </p>
            <ul className="flex flex-col gap-1.5">
              {sent.map((f, i) => (
                <li key={`${i}:${f}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
