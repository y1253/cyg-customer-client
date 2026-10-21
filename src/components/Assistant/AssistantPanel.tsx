import { useState } from 'react'
import { Lightbulb, MessageCircle, MessageSquareText, Phone, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { AssistantConversation } from '@/api/assistant'
import { uploadAttachments } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAssistantRules,
  useConversationMessages,
  useConversations,
  useDeleteAssistantRule,
  useSendAssistantMessage,
} from '@/hooks/useAssistant'
import { useBook } from '@/hooks/useBook'
import { useInvalidateBookkeeping } from '@/hooks/useInvalidateBookkeeping'
import { channelLabel, conversationLabel } from '@/lib/assistant'
import { cn } from '@/lib/utils'
import { ChatPanel } from './ChatPanel'

const ago = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function ChannelIcon({ c }: { c: AssistantConversation }) {
  if (c.channel === 'SMS') return <MessageSquareText className="size-4 shrink-0 text-sky-600" />
  if (c.channel === 'WHATSAPP') return <MessageCircle className="size-4 shrink-0 text-emerald-600" />
  if (c.channel === 'VOICE') return <Phone className="size-4 shrink-0 text-violet-600" />
  return <Sparkles className="size-4 shrink-0 text-brand" />
}

/** Why a thread can only be read here (it is answered somewhere else). */
function readOnlyReason(c: AssistantConversation | undefined): string | undefined {
  if (!c) return undefined
  if (c.channel === 'SMS') return 'This conversation happened by text — reply from your phone to continue it.'
  if (c.channel === 'WHATSAPP') return 'This conversation happened on WhatsApp — reply there to continue it.'
  if (c.channel === 'VOICE') return 'These were phone calls — call our receipt number to talk to the AI again.'
  if (c.channel === 'EMAIL') return 'This conversation happened by email — reply to that email to continue it.'
  if (c.attachmentId) return 'This chat is about one attachment — continue it from Attachments → Ask AI.'
  return undefined
}

/**
 * The AI assistant for this book (the general one, or one business's — `BookScopeProvider`):
 * ask about the books ("my transactions from March") or ask for a change ("move Costco to
 * Office supplies") and it does it. Every conversation of the book is listed, the ones the
 * customer had by text or WhatsApp too, plus what the AI learned about this book.
 */
export function AssistantPanel() {
  const conversations = useConversations()
  const [selected, setSelected] = useState<number | null>(null)
  const messages = useConversationMessages(selected)
  const send = useSendAssistantMessage()
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  const list = conversations.data ?? []
  const current = list.find((c) => c.id === selected)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Conversations" className="flex flex-col gap-2">
          <Button variant="outline" className="justify-start gap-1.5" onClick={() => setSelected(null)}>
            <Plus className="size-4" /> New chat
          </Button>
          {conversations.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : (
            <div className="flex max-h-[32rem] flex-col gap-1.5 overflow-y-auto">
              {list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id)}
                  aria-current={c.id === selected ? 'true' : undefined}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition-colors',
                    c.id === selected
                      ? 'bg-brand/10 ring-brand/30'
                      : 'bg-white ring-black/5 hover:bg-muted/50',
                  )}
                >
                  <ChannelIcon c={c} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-[#0B1C2C]">{conversationLabel(c)}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{ago(c.lastMessageAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {channelLabel(c.channel)}
                      {c.preview ? ` · ${c.preview}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {conversations.error && <p className="text-sm text-destructive">{conversations.error.message}</p>}
        </nav>

        <section className="flex min-h-[28rem] flex-col rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <ChatPanel
            key={selected ?? 'new'}
            className="h-[32rem]"
            messages={selected === null ? [] : (messages.data ?? [])}
            loading={selected !== null && messages.isLoading}
            disabled={readOnlyReason(current)}
            allowFiles
            onSend={async (text, files) => {
              // Files go up first (into this book, like any upload); the message then carries
              // their ids and the AI answers once they are read.
              const added = files.length ? await uploadAttachments(book.auth, files, null, () => {}) : []
              if (added.length) void invalidate()
              const r = await send.mutateAsync({
                conversationId: selected ?? undefined,
                text,
                attachmentIds: added.map((a) => a.id),
              })
              setSelected(r.conversationId)
            }}
            empty={
              <>
                <Sparkles className="mx-auto mb-2 size-6 text-brand" />
                Ask anything about your books — “show my transactions from March”, “what did I spend at Costco?”,
                “move Uber to Travel”. Add a receipt, a cheque or a letter with the paperclip and the AI will
                read it. You can also text or WhatsApp our receipt number.
              </>
            }
          />
        </section>
      </div>

      <LearnedRules />
    </div>
  )
}

/** The short rules the AI saved for this book; deleting one makes the AI forget it. */
function LearnedRules() {
  const rules = useAssistantRules()
  const remove = useDeleteAssistantRule()
  const list = rules.data ?? []
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="flex items-center gap-2 font-semibold text-[#0B1C2C]">
        <Lightbulb className="size-4 text-amber-500" /> What the AI learned
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Rules the AI saved from your chats. It follows them every time it reads your statements and receipts.
      </p>
      {rules.isLoading ? (
        <Skeleton className="mt-3 h-10 rounded-lg" />
      ) : !list.length ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="mt-3 divide-y rounded-xl ring-1 ring-black/5">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">{r.text}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground uppercase">{r.topic.toLowerCase()}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Forget this rule"
                disabled={remove.isPending}
                onClick={() => remove.mutate(r.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {remove.error && <p className="mt-2 text-sm text-destructive">{remove.error.message}</p>}
    </section>
  )
}
