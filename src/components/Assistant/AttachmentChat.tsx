import { useAttachmentChat, useSendAttachmentChat } from '@/hooks/useAssistant'
import { ChatPanel } from './ChatPanel'

/**
 * "Ask AI" about one attachment: the customer says where it belongs, why it didn't match, or
 * — step9, any file, attached or not — what we got wrong (read wrong, the wrong transaction,
 * two cheques in one image). The AI reports the mistake, fixes it (re-attaches it, or reads
 * the file again, cutting several cheques into one file each), and remembers a short rule
 * when it understood the reason. Filed without understanding → the answer carries a warning.
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
      placeholder="e.g. “It’s the Amazon charge on March 3” or “There are two cheques in this image”"
      empty="Tell the AI where this belongs, or what is wrong with it."
    />
  )
}
