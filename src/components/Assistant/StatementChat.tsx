import { useSendStatementChat, useStatementChat } from '@/hooks/useAssistant'
import { ChatPanel } from './ChatPanel'

/**
 * step8: "Ask AI" about one statement we could not read. The customer says what was wrong
 * ("withdrawals on page 3 were read as deposits", "it's a credit card"); the AI reports the
 * mistake (the strong AI decides whether it is a problem for every statement, this book, or
 * only this one) and reads the statement again with the customer's note.
 */
export function StatementChat({ statementId }: { statementId: number }) {
  const chat = useStatementChat(statementId)
  const send = useSendStatementChat(statementId)
  return (
    <ChatPanel
      className="max-h-[28rem]"
      messages={chat.data?.messages ?? []}
      loading={chat.isLoading}
      onSend={(text) => send.mutateAsync(text)}
      placeholder="e.g. “The withdrawals on page 3 were read as deposits”"
      empty="Tell the AI what is wrong with this statement — it will fix how it is read and try again."
    />
  )
}
