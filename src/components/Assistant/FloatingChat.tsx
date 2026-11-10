import { useEffect, useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, MessageCircle, MessageSquareText, Mic, Phone, PhoneCall, Plus, Send, Sparkles } from 'lucide-react'
import { uploadAttachments } from '@/api/attachments'
import { requestCallMe, requestWelcomeText } from '@/api/assistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { BookScopeProvider } from '@/context/BookScopeContext'
import {
  useAssistantEnabled,
  useConversationMessages,
  useConversations,
  useSendAssistantMessage,
} from '@/hooks/useAssistant'
import { useBook } from '@/hooks/useBook'
import { useIntake } from '@/hooks/useIntake'
import { useInvalidateBookkeeping } from '@/hooks/useInvalidateBookkeeping'
import { useUpdateMe } from '@/hooks/useUpdateMe'
import { fmtPhone } from '@/lib/attachment-labels'
import { OPEN_CHAT_EVENT, useFloatingChatState } from '@/lib/floating-chat'
import { cn } from '@/lib/utils'
import { ChatPanel } from './ChatPanel'

/**
 * Opens the floating chat from anywhere ("Ask AI" on the balance sheet…), with `text`
 * already in its message box for the customer to edit and send. step2 (2026-11-09):
 * `dictate` opens it with the mic already recording.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function openFloatingChat(text?: string, options?: { dictate?: boolean }) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { text, dictate: options?.dictate } }))
}

type Draft = { text: string; n: number; dictate: boolean }

/** The chat inside the sheet: the book's newest website conversation, or a new one. */
function FloatingChatBody({ draft }: { draft: Draft }) {
  const conversations = useConversations()
  // undefined = not chosen yet (the newest website chat is picked once the list loads).
  const [chosen, setChosen] = useState<number | null | undefined>(undefined)
  const newest =
    (conversations.data ?? []).find(
      (c) => c.channel === 'BOT' && !c.attachmentId && !c.statementId,
    )?.id ?? null
  const selected = chosen === undefined ? (conversations.isLoading ? null : newest) : chosen
  const messages = useConversationMessages(selected)
  const send = useSendAssistantMessage()
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selected === null ? 'New conversation' : 'Your latest conversation'}
        </p>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setChosen(null)}>
          <Plus className="size-3.5" /> New chat
        </Button>
      </div>
      <ChatPanel
        key={`${selected ?? 'new'}:${draft.n}`}
        className="min-h-0 flex-1"
        initialDraft={draft.text}
        autoDictate={draft.dictate}
        messages={selected === null ? [] : (messages.data ?? [])}
        loading={conversations.isLoading || (selected !== null && messages.isLoading)}
        allowFiles
        onSend={async (text, files) => {
          const added = files.length ? await uploadAttachments(book.auth, files, null, () => {}) : []
          if (added.length) void invalidate()
          const r = await send.mutateAsync({
            conversationId: selected ?? undefined,
            text,
            attachmentIds: added.map((a) => a.id),
          })
          setChosen(r.conversationId)
        }}
        empty={
          <>
            <Sparkles className="mx-auto mb-2 size-6 text-brand" />
            Ask anything about your books, or ask for a change — type it, or press the mic and say it.
          </>
        }
      />
    </div>
  )
}

/** One row of the hover card: an icon, what it does, and a line under it. */
function Way({
  icon,
  title,
  hint,
  onClick,
  busy,
  tone = 'brand',
}: {
  icon: ReactNode
  title: string
  hint: string
  onClick?: () => void
  busy?: boolean
  tone?: 'brand' | 'navy' | 'green'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/70 disabled:opacity-60"
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105',
          tone === 'brand' && 'bg-brand/10 text-brand',
          tone === 'navy' && 'bg-[#0B1C2C]/5 text-[#0B1C2C]',
          tone === 'green' && 'bg-emerald-50 text-emerald-700',
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#0B1C2C]">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

/**
 * step2 (2026-11-09): what the bubble offers on hover — chat on the web (typed or dictated),
 * our AI number (call, text, WhatsApp), "Call me" and "Text me a welcome". Call me and the
 * welcome text need the customer's phone: without one the card asks for it first.
 */
function ReachCard({ onChat }: { onChat: (dictate: boolean) => void }) {
  const { customer } = useAuth()
  const book = useBook()
  const intake = useIntake()
  const updateMe = useUpdateMe()
  const [phone, setPhone] = useState('')
  const [asking, setAsking] = useState<'call' | 'welcome' | null>(null)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const callMe = useMutation({ mutationFn: () => requestCallMe(book.auth, {}) })
  const welcome = useMutation({ mutationFn: () => requestWelcomeText(book.auth) })

  const number = intake.data?.numbers[0]
  const whatsapp = !!number && (intake.data?.whatsapp ?? []).includes(number)
  const voice = !!intake.data?.voice
  const hasPhone = !!customer?.phone

  const run = (what: 'call' | 'welcome') => {
    setNote(null)
    const m = what === 'call' ? callMe : welcome
    m.mutate(undefined, {
      onSuccess: (r) =>
        setNote({ ok: r.ok, text: r.ok ? (what === 'call' ? `${r.message} — pick up!` : r.message) : r.message }),
      onError: (e) => setNote({ ok: false, text: e.message }),
    })
  }
  const ask = (what: 'call' | 'welcome') => (hasPhone ? run(what) : setAsking(what))

  return (
    <div className="flex flex-col">
      <div className="rounded-t-xl bg-gradient-to-br from-[#0B1C2C] to-[#12384a] px-4 py-3 text-white">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-[#47c4bc]" /> Your AI bookkeeper
        </p>
        <p className="text-xs text-white/70">Ask anything, any way you like — it answers right away.</p>
      </div>

      <div className="flex flex-col gap-0.5 p-1.5">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Way icon={<MessageCircle className="size-4" />} title="Chat on the web" hint="Type your question" onClick={() => onChat(false)} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mr-1 shrink-0 gap-1.5 rounded-full"
            title="Open the chat and start speaking"
            onClick={() => onChat(true)}
          >
            <Mic className="size-3.5" /> Dictate
          </Button>
        </div>

        {number && (
          <div className="mx-1 my-1 rounded-xl bg-muted/50 p-2.5">
            <p className="text-xs text-muted-foreground">
              {voice ? 'Call, text' : 'Text'}
              {whatsapp ? ' or WhatsApp' : ''} the AI at
            </p>
            <p className="text-base font-semibold text-[#0B1C2C] tabular-nums">{fmtPhone(number)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {voice && (
                <a
                  href={`tel:${number}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#0B1C2C] ring-1 ring-black/10 hover:bg-muted"
                >
                  <Phone className="size-3.5" /> Call
                </a>
              )}
              <a
                href={`sms:${number}`}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand ring-1 ring-brand/20 hover:bg-brand/5"
              >
                <MessageSquareText className="size-3.5" /> Text
              </a>
              {whatsapp && (
                <a
                  href={`https://wa.me/${number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {voice && (
          <Way
            icon={<PhoneCall className="size-4" />}
            title="Call me"
            hint={hasPhone ? `The AI calls you now at ${fmtPhone(customer!.phone!)}` : 'The AI calls you now'}
            tone="navy"
            busy={callMe.isPending}
            onClick={() => ask('call')}
          />
        )}
        {number && (
          <Way
            icon={<Send className="size-4" />}
            title="Text me a welcome"
            hint="Get our number by SMS — save it for later"
            tone="green"
            busy={welcome.isPending}
            onClick={() => ask('welcome')}
          />
        )}

        {asking && (
          <form
            className="mx-1 mt-1 flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!phone.trim()) return
              updateMe.mutate(
                { phone: phone.trim() },
                {
                  onSuccess: () => {
                    const what = asking
                    setAsking(null)
                    run(what)
                  },
                },
              )
            }}
          >
            <p className="text-xs text-muted-foreground">Your phone number — saved on your account:</p>
            <div className="flex gap-1.5">
              <Input
                autoFocus
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                placeholder="514 555 1234"
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 bg-white"
              />
              <Button type="submit" size="sm" disabled={updateMe.isPending || !phone.trim()} className="bg-brand text-white hover:bg-brand/85">
                {updateMe.isPending ? <Loader2 className="size-3.5 animate-spin" /> : asking === 'call' ? 'Call me' : 'Send'}
              </Button>
            </div>
            {updateMe.error && <p className="text-xs text-destructive">{updateMe.error.message}</p>}
          </form>
        )}

        {note && (
          <p
            role="status"
            className={cn(
              'mx-1 mt-1 rounded-lg px-2.5 py-1.5 text-xs',
              note.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-destructive',
            )}
          >
            {note.text}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * step8: the AI chat, one click away on every dashboard page — a round button pinned to the
 * bottom-right corner that opens the chat in a side sheet, without leaving the page. It
 * talks to the book the page has open (`useFloatingChatBook`), else the default book.
 * step2 (2026-11-09): the bubble says "AI" and flips over every few seconds; hovering it
 * (tapping, on a phone) shows every way to reach the AI — `ReachCard`. 2026-11-10: a click
 * shows the same card too; the chat opens from the card.
 */
export function FloatingChat() {
  const enabled = useAssistantEnabled()
  const { scope, hidden } = useFloatingChatState()
  const [open, setOpen] = useState(false)
  const [card, setCard] = useState(false)
  const [draft, setDraft] = useState<Draft>({ text: '', n: 0, dictate: false })

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; dictate?: boolean } | undefined>).detail
      setDraft((d) => ({ text: detail?.text ?? '', n: d.n + 1, dictate: !!detail?.dictate }))
      setCard(false)
      setOpen(true)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  if (!enabled) return null
  const book = (children: ReactNode) => (
    <BookScopeProvider
      key={scope ? `${scope.bookId}:${scope.companyId}` : 'default'}
      bookId={scope?.bookId ?? null}
      companyId={scope?.companyId ?? null}
    >
      {children}
    </BookScopeProvider>
  )
  const startChat = (dictate: boolean) => {
    setDraft((d) => ({ text: '', n: d.n + 1, dictate }))
    setCard(false)
    setOpen(true)
  }

  return (
    <>
      {!hidden && !open && (
        <Popover open={card} onOpenChange={setCard}>
          <PopoverTrigger
            openOnHover
            delay={120}
            closeDelay={250}
            aria-label="Talk to the AI assistant"
            className="group fixed right-4 bottom-4 z-40 size-16 rounded-full [perspective:600px] focus-visible:outline-none sm:right-6 sm:bottom-6"
          >
            {/* The ripple behind the bubble, in step with the flip. */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#3BBFB4] opacity-0 motion-safe:animate-ai-ripple"
            />
            <span
              className={cn(
                'relative block size-full rounded-full transition-transform duration-300 [transform-style:preserve-3d] group-hover:scale-105 motion-safe:animate-ai-flip',
                card && 'scale-105 [animation-play-state:paused]',
              )}
            >
              <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#47c4bc] to-[#169f96] text-white shadow-lg ring-4 ring-white/70 [backface-visibility:hidden]">
                <span className="text-xl leading-none font-extrabold tracking-tight">AI</span>
                <Sparkles className="mt-0.5 size-3.5 opacity-90" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#0B1C2C] to-[#12384a] text-white shadow-lg ring-4 ring-white/70 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <MessageCircle className="size-6" />
              </span>
            </span>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={10} className="w-80 gap-0 overflow-hidden rounded-xl p-0">
            {book(<ReachCard onChat={startChat} />)}
          </PopoverContent>
        </Popover>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-3 p-0 sm:max-w-md data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <div className="px-4 pt-4">
            <SheetTitle className="flex items-center gap-1.5 text-base text-[#0B1C2C]">
              <Sparkles className="size-4 text-brand" /> AI assistant
            </SheetTitle>
          </div>
          {open && book(<FloatingChatBody draft={draft} />)}
        </SheetContent>
      </Sheet>
    </>
  )
}
