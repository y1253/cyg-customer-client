import { useTranslation } from 'react-i18next'
import { useAttachmentChat, useSendAttachmentChat } from '@/hooks/useAssistant'
import { CallMeButton } from './CallMeButton'
import { ChatPanel } from './ChatPanel'

/**
 * "Ask AI" about one attachment: the customer says where it belongs, why it didn't match, or
 * — step9, any file, attached or not — what we got wrong (read wrong, the wrong transaction,
 * two cheques in one image). The AI reports the mistake, fixes it (re-attaches it, or reads
 * the file again, cutting several cheques into one file each), and remembers a short rule
 * when it understood the reason. Filed without understanding → the answer carries a warning.
 */
export function AttachmentChat({ attachmentId }: { attachmentId: number }) {
  const { t } = useTranslation(['assistant', 'common'])
  const chat = useAttachmentChat(attachmentId)
  const send = useSendAttachmentChat(attachmentId)
  return (
    <ChatPanel
      className="max-h-[28rem]"
      messages={chat.data?.messages ?? []}
      loading={chat.isLoading}
      onSend={(text) => send.mutateAsync(text)}
      placeholder={t('attachmentChat.placeholder')}
      empty={t('attachmentChat.empty')}
      extraAction={<CallMeButton target={{ attachmentId }} />}
    />
  )
}
