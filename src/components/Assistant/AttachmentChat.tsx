import { useAttachmentChat, useSendAttachmentChat } from '@/hooks/useAssistant'
import { ChatPanel } from './ChatPanel'

/**
 * "Ask AI" about one attachment we could not file: the customer says where it belongs or
 * why it didn't match; the AI searches again, files it, and remembers a short rule when it
 * understood the reason. Filed without understanding → the answer carries a warning.
 */
export function AttachmentChat({ attachmentId }: { attachmentId: number }) {
  const chat = useAttachmentChat(attachmentId)
  const send = useSendAttachmentChat(attachmentId)
  return (
    <ChatPanel
      className="max-h-[28rem]"
      messages={chat.data?.messages ?? []}
      loading={chat.isLoading}
      onSend={(text) => send.mutateAsync(text)}
      placeholder="e.g. “It’s the Amazon charge on March 3”"
      empty="Tell the AI where this belongs or why it didn't match."
    />
  )
}
