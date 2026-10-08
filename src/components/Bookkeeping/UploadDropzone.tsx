import { useRef, useState, type DragEvent } from 'react'
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react'
import { MAX_STATEMENT_BYTES } from '@/api/bookkeeping'
import { Progress } from '@/components/ui/progress'
import { useUploadStatements } from '@/hooks/useUploadStatements'
import { cn } from '@/lib/utils'

const isPdf = (f: File) => /\.pdf$/i.test(f.name)

/**
 * Drag-and-drop (or browse) any number of PDF statements. Files are checked here for type
 * and size so a wrong file is named before anything uploads; the server checks again.
 */
export function UploadDropzone() {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadStatements()
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastCount, setLastCount] = useState(0)

  function accept(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (!files.length || upload.isPending) return
    const notPdf = files.filter((f) => !isPdf(f))
    const tooBig = files.filter((f) => isPdf(f) && f.size > MAX_STATEMENT_BYTES)
    const ok = files.filter((f) => isPdf(f) && f.size <= MAX_STATEMENT_BYTES)
    const skipped = [
      notPdf.length && `${notPdf.length} not a PDF (${notPdf.map((f) => f.name).slice(0, 2).join(', ')}${notPdf.length > 2 ? '…' : ''})`,
      tooBig.length && `${tooBig.length} over 50 MB`,
    ].filter(Boolean)
    setNotice(skipped.length ? `Skipped ${skipped.join(' and ')}.` : null)
    if (!ok.length) return
    setLastCount(ok.length)
    upload.mutate(ok)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={upload.isPending}
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors outline-none',
          'focus-visible:ring-3 focus-visible:ring-brand/40',
          dragging ? 'border-brand bg-brand/5' : 'border-black/10 bg-white hover:border-brand/60 hover:bg-brand/[0.03]',
          upload.isPending && 'cursor-wait',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-transform group-hover:scale-105">
          {upload.isPending ? <Loader2 className="size-7 animate-spin" /> : <FileUp className="size-7" />}
        </span>
        <div>
          <p className="text-base font-semibold text-[#0B1C2C]">
            {upload.isPending ? `Uploading ${lastCount} statement${lastCount === 1 ? '' : 's'}…` : 'Drop bank statements here'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or <span className="font-medium text-brand underline-offset-4 group-hover:underline">browse your files</span>{' '}
            — PDF, as many as you like
          </p>
        </div>
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          accept(e.target.files)
          e.target.value = ''
        }}
      />
      {upload.isPending && <Progress value={Math.round(upload.progress * 100)} className="h-1.5" />}
      {upload.isSuccess && !upload.isPending && (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /> Uploaded — click Generate when you have added them all.
        </p>
      )}
      {upload.error && (
        <p role="alert" className="text-sm text-destructive">
          {upload.error.message}
        </p>
      )}
      {notice && <p className="text-sm text-amber-700">{notice}</p>}
    </div>
  )
}
