import { useSendStatementChat, useStatementChat } from '@/hooks/useAssistant'
import { CallMeButton } from './CallMeButton'
import { ChatPanel } from './ChatPanel'

/**
 * step8: "Ask AI" about one statement we could not read. The customer says what was wrong
 * ("withdrawals on page 3 were read as deposits", "it's a credit card"); the AI reports the
 * mistake (the strong AI decides whether it is a problem for every statement, this book, or
 * only this one) and reads the statement again with the customer's note. step2: any statement
 * (a read one too — wrong balances, starting dates that do not carry over), and "Call me".
 */
export function StatementChat({ statementId, initialDraft }: { statementId: number; initialDraft?: string }) {
  const chat = useStatementChat(statementId)
  const send = useSendStatementChat(statementId)
  return (
    <ChatPanel
      className="max-h-[28rem]"
      messages={chat.data?.messages ?? []}
      loading={chat.isLoading}
      onSend={(text) => send.mutateAsync(text)}
      placeholder="e.g. “The withdrawals on page 3 were read as deposits”"
      empty="Tell the AI what is wrong with this statement, or press the phone to talk it through — it can read it again or fix its balances."
      initialDraft={initialDraft}
      extraAction={<CallMeButton target={{ statementId }} />}
    />
  )
}
