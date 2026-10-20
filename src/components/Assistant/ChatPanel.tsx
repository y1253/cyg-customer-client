import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AlertTriangle, Loader2, SendHorizontal, Sparkles } from 'lucide-react'
import type { AssistantMessage } from '@/api/assistant'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { channelLabel, optimisticMessage } from '@/lib/assistant'
import { cn } from '@/lib/utils'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** One message: the customer on the right (teal), the AI on the left, with what it did. */
function ChatBubble({ m }: { m: AssistantMessage }) {
  const own = m.role === 'USER'
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
        <p className="break-words whitespace-pre-wrap">{m.text}</p>
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
}: {
  messages: AssistantMessage[]
  loading?: boolean
  /** Resolves when the AI answered (the parent's query then holds both messages). */
  onSend: (text: string) => Promise<unknown>
  empty?: ReactNode
  className?: string
  placeholder?: string
  /** E.g. a text/WhatsApp thread, which is answered over that channel, not here. */
  disabled?: string
}) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<AssistantMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, pending])

  const send = () => {
    const text = draft.trim()
    if (!text || pending) return
    setError(null)
    setPending(optimisticMessage(text))
    setDraft('')
    onSend(text)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'The assistant could not answer.')
        setDraft(text)
      })
      .finally(() => setPending(null))
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
            <Loader2 className="size-3.5 animate-spin" /> The AI is thinking…
          </p>
        )}
        <div ref={end} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {disabled ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{disabled}</p>
      ) : (
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            maxLength={2000}
            rows={2}
            className="max-h-40 min-h-11 resize-none bg-white"
          />
          <Button onClick={send} disabled={!draft.trim() || !!pending} className="h-11 shrink-0 gap-1.5">
            <SendHorizontal className="size-4" /> Send
          </Button>
        </div>
      )}
    </div>
  )
}
