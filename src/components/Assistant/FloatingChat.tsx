import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, Plus, Sparkles } from 'lucide-react'
import { uploadAttachments } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { BookScopeProvider } from '@/context/BookScopeContext'
import {
  useAssistantEnabled,
  useConversationMessages,
  useConversations,
  useSendAssistantMessage,
} from '@/hooks/useAssistant'
import { useBook } from '@/hooks/useBook'
import { useInvalidateBookkeeping } from '@/hooks/useInvalidateBookkeeping'
import { OPEN_CHAT_EVENT, useFloatingChatState } from '@/lib/floating-chat'
import { ChatPanel } from './ChatPanel'

/**
 * Opens the floating chat from anywhere ("Ask AI" on the balance sheet…), with `text`
 * already in its message box for the customer to edit and send.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function openFloatingChat(text?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { text } }))
}

/** The chat inside the sheet: the book's newest website conversation, or a new one. */
function FloatingChatBody({ draft }: { draft: { text: string; n: number } }) {
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

/**
 * step8: the AI chat, one click away on every dashboard page — a round button pinned to the
 * bottom-right corner that opens the chat in a side sheet, without leaving the page. It
 * talks to the book the page has open (`useFloatingChatBook`), else the default book. Hidden
 * where the page already IS the chat (`/dashboard/assistant`, the Bookkeeping Assistant tab).
 */
export function FloatingChat() {
  const enabled = useAssistantEnabled()
  const { pathname } = useLocation()
  const { scope, hidden } = useFloatingChatState()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ text: '', n: 0 })

  useEffect(() => {
    const onOpen = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string } | undefined>).detail?.text ?? ''
      setDraft((d) => ({ text, n: d.n + 1 }))
      setOpen(true)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  if (!enabled) return null
  const buttonHidden = hidden || pathname.startsWith('/dashboard/assistant')

  return (
    <>
      {!buttonHidden && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with the AI assistant"
          title="Chat with the AI assistant"
          className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#3BBFB4] text-white shadow-lg ring-4 ring-white/60 transition hover:bg-[#1f8f86] focus-visible:outline-none focus-visible:ring-[#3BBFB4]/40 sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-3 p-0 sm:max-w-md data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <div className="px-4 pt-4">
            <SheetTitle className="flex items-center gap-1.5 text-base text-[#0B1C2C]">
              <Sparkles className="size-4 text-brand" /> AI assistant
            </SheetTitle>
          </div>
          {open && (
            <BookScopeProvider
              key={scope ? `${scope.bookId}:${scope.companyId}` : 'default'}
              bookId={scope?.bookId ?? null}
              companyId={scope?.companyId ?? null}
            >
              <FloatingChatBody draft={draft} />
            </BookScopeProvider>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
