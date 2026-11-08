import { StatementChat } from '@/components/Assistant/StatementChat'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStatements } from '@/hooks/useStatements'
import { STARTS_WARNING } from '@/lib/starting-dates'
import { folderOf } from './statement-folders'

/**
 * step2: "Ask AI" on an account with more than one starting date (the balance sheet). Opens
 * the chat of the account's first read statement — its prompt lists every statement of the
 * account with its balances, so the AI can see which one does not carry over — with a draft
 * that says what is wrong. Dictation and "Call me" are in the chat.
 */
export function StartsChatDialog({
  target,
  onClose,
}: {
  target: { account: string; note: string } | null
  onClose: () => void
}) {
  const statements = useStatements().data ?? []
  const first = target
    ? statements
        .filter((s) => s.status === 'DONE' && folderOf(s) === target.account)
        .sort((a, b) => (a.periodStart ?? '').localeCompare(b.periodStart ?? ''))[0]
    : undefined
  const dates = target?.note.replace(/^Starting dates: /, '')
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{target?.account}: more than one starting date</DialogTitle>
          <DialogDescription>{STARTS_WARNING}</DialogDescription>
        </DialogHeader>
        {first ? (
          <StatementChat
            key={first.id}
            statementId={first.id}
            initialDraft={`${target?.account} has more than one starting date (${dates}). Why don't its balances carry over, and how do we fix it?`}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No read statement of this account yet.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
