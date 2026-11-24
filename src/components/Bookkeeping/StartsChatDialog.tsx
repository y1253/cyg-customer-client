import { StatementChat } from '@/components/Assistant/StatementChat'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStatements } from '@/hooks/useStatements'
import { startsWarning } from '@/lib/starting-dates'
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
  /** `note`: the account's starts and why they break ("a · b. reason"). */
  target: { account: string; note: string } | null
  onClose: () => void
}) {
  const { t } = useTranslation(['books', 'common'])
  const statements = useStatements().data ?? []
  const first = target
    ? statements
        .filter((s) => s.status === 'DONE' && folderOf(s) === target.account)
        .sort((a, b) => (a.periodStart ?? '').localeCompare(b.periodStart ?? ''))[0]
    : undefined
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('startsChat.title', { account: target?.account })}</DialogTitle>
          <DialogDescription>{startsWarning()}</DialogDescription>
        </DialogHeader>
        {first ? (
          <StatementChat
            key={first.id}
            statementId={first.id}
            initialDraft={t('statements.askStarts', { account: target?.account, dates: target?.note, why: '' })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t('startsChat.none')}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
