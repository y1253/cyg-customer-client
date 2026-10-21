import { Loader2, MessagesSquare } from 'lucide-react'
import { useAttachmentMessages } from '@/hooks/useAssistant'
import { ChatBubble } from './ChatPanel'

/**
 * step11b: every AI message linked to one attachment, whatever channel it was on — the text
 * or WhatsApp it arrived with and the answer, its "Ask AI" chat, what the assistant did to
 * it. Read-only; the same messages stay on the Communication tab even after the file is
 * deleted.
 */
export function AttachmentConversation({ attachmentId }: { attachmentId: number }) {
  const messages = useAttachmentMessages(attachmentId)
  if (messages.isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading the conversation…
      </p>
    )
  }
  const list = messages.data ?? []
  if (!list.length) return null
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-muted/30 p-3">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1C2C]">
        <MessagesSquare className="size-3.5 text-brand" /> Conversation about this file
      </h4>
      <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto">
        {list.map((m) => (
          <ChatBubble key={m.id} m={m} />
        ))}
      </div>
    </section>
  )
}
