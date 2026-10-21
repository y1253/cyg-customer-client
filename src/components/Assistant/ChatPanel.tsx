import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { AlertTriangle, FileText, Loader2, Paperclip, SendHorizontal, Sparkles, X } from 'lucide-react'
import type { AssistantMessage, AssistantMessageFile } from '@/api/assistant'
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, isAcceptedAttachment } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { channelLabel, isFileLabel, linkParts, optimisticMessage } from '@/lib/assistant'
import { cn } from '@/lib/utils'

/** At most this many files go with one message (the server's limit). */
const MAX_FILES = 10

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The text of a message, with any link it carries clickable (the AI sends file links). */
function MessageText({ text, own }: { text: string; own: boolean }) {
  return (
    <p className="break-words whitespace-pre-wrap">
      {linkParts(text).map((p, i) =>
        p.href ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noreferrer"
            className={cn('break-all underline underline-offset-2', own ? 'text-white' : 'text-[#1f8f86]')}
          >
            {p.href.includes('/api/f/') ? 'Open the file' : p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  )
}

/** The files a message came with or is about; a deleted one stays, struck through. */
function MessageFiles({ files, own }: { files: AssistantMessageFile[]; own: boolean }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {files.map((f) => (
        <li
          key={`${f.id}:${f.role}`}
          title={f.live ? f.filename : 'This file was removed since'}
          className={cn(
            'flex max-w-56 items-center gap-1 rounded-md px-2 py-1 text-xs',
            own ? 'bg-white/20 text-white' : 'bg-muted text-[#0B1C2C]',
            !f.live && 'opacity-70',
          )}
        >
          <FileText className="size-3.5 shrink-0" />
          <span className={cn('truncate', !f.live && 'line-through')}>{f.filename}</span>
          {!f.live && <span className="shrink-0">(removed)</span>}
        </li>
      ))}
    </ul>
  )
}

/** One message: the customer on the right (teal), the AI on the left, with what it did. */
export function ChatBubble({ m }: { m: AssistantMessage }) {
  const own = m.role === 'USER'
  const files = m.files ?? []
  const text = files.length && isFileLabel(m.text) ? null : m.text
  return (
    <div className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          own ? 'rounded-br-md bg-[#3BBFB4] text-white' : 'rounded-bl-md border bg-background',
          m.id < 0 && 'opacity-70',
        )}
      >
        {!own && (
          <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-[#1f8f86]">
            <Sparkles className="size-3" /> AI assistant
          </p>
        )}
        {text && <MessageText text={text} own={own} />}
        {files.length > 0 && <MessageFiles files={files} own={own} />}
        {m.warning && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 ring-1 ring-amber-600/20">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>{m.warning}</span>
          </p>
        )}
        {!!m.actions?.length && (
          <div className="mt-2 border-t pt-1.5 text-xs">
            <p className="font-medium text-muted-foreground">AI did:</p>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {m.actions.map((a, i) => (
                <li key={i} className={a.ok ? 'text-[#0B1C2C]/80' : 'text-red-600'}>
                  {a.ok ? '✓' : '✗'} {a.summary}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p
          className={cn(
            'mt-1 flex justify-end gap-1.5 text-[10px]',
            own ? 'text-white/75' : 'text-muted-foreground',
          )}
        >
          <span className="rounded bg-black/5 px-1">{channelLabel(m.channel)}</span>
          {when(m.createdAt)}
        </p>
      </div>
    </div>
  )
}

/**
 * The AI assistant's conversation: messages (with the channel each came in on, warnings and
 * what the AI changed), and a box to write the next one. Enter sends, Shift+Enter is a new
 * line. The message shows at once while the AI thinks; a failed send puts the text back.
 */
export function ChatPanel({
  messages,
  loading,
  onSend,
  empty,
  className,
  placeholder = 'Ask about your books…',
  disabled,
  allowFiles,
}: {
  messages: AssistantMessage[]
  loading?: boolean
  /** Resolves when the AI answered (the parent's query then holds both messages). */
  onSend: (text: string, files: File[]) => Promise<unknown>
  empty?: ReactNode
  className?: string
  placeholder?: string
  /** E.g. a text/WhatsApp thread, which is answered over that channel, not here. */
  disabled?: string
  /** step11b: the customer may add files (receipts, cheques, letters…) to a message. */
  allowFiles?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [pending, setPending] = useState<AssistantMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, pending])

  /** Adds picked / dropped / pasted files, refusing what the server would refuse. */
  const addFiles = (list: FileList | File[] | null) => {
    if (!allowFiles || !list) return
    const incoming = Array.from(list)
    const ok = incoming.filter((f) => isAcceptedAttachment(f) && f.size <= MAX_ATTACHMENT_BYTES)
    const refused = incoming.length - ok.length
    setFiles((prev) => [...prev, ...ok].slice(0, MAX_FILES))
    setError(
      refused
        ? `${refused} file${refused === 1 ? ' was' : 's were'} not added — use a photo (JPG, PNG), a PDF or a voice note under 25 MB.`
        : null,
    )
  }

  const send = () => {
    const text = draft.trim()
    if ((!text && !files.length) || pending) return
    const sending = files
    setError(null)
    setPending(optimisticMessage(text, new Date(), sending.map((f) => f.name)))
    setDraft('')
    setFiles([])
    onSend(text, sending)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'The assistant could not answer.')
        setDraft(text)
        setFiles(sending)
      })
      .finally(() => setPending(null))
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!allowFiles) return
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (allowFiles && e.clipboardData.files.length) {
      e.preventDefault()
      addFiles(e.clipboardData.files)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const shown = pending ? [...messages, pending] : messages
  return (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex min-h-40 flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl bg-muted/30 p-3">
        {loading ? (
          <p className="m-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : !shown.length ? (
          <div className="m-auto max-w-sm text-center text-sm text-muted-foreground">{empty}</div>
        ) : (
          shown.map((m) => <ChatBubble key={m.id} m={m} />)
        )}
        {pending && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {pending.files?.length ? 'Reading your files… this can take a minute.' : 'The AI is thinking…'}
          </p>
        )}
        <div ref={end} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {disabled ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{disabled}</p>
      ) : (
        <div
          className={cn('flex flex-col gap-2 rounded-xl', dragging && 'ring-2 ring-brand/40')}
          onDragOver={(e) => {
            if (!allowFiles) return
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}:${i}`}
                  className="flex max-w-60 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-[#0B1C2C]"
                >
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}
                    className="ml-0.5 rounded text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            {allowFiles && (
              <>
                <input
                  ref={picker}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Add a file (receipt, cheque, letter…)"
                  aria-label="Add a file"
                  disabled={!!pending || files.length >= MAX_FILES}
                  onClick={() => picker.current?.click()}
                  className="h-11 w-11 shrink-0"
                >
                  <Paperclip className="size-4" />
                </Button>
              </>
            )}
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={placeholder}
              maxLength={2000}
              rows={2}
              className="max-h-40 min-h-11 resize-none bg-white"
            />
            <Button
              onClick={send}
              disabled={(!draft.trim() && !files.length) || !!pending}
              className="h-11 shrink-0 gap-1.5"
            >
              <SendHorizontal className="size-4" /> Send
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
