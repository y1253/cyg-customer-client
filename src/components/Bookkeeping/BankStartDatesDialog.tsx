import { useState } from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BankConnection } from '@/api/bankFeeds'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSaveStartDates } from '@/hooks/useBankFeeds'
import { useClosingValue } from '@/hooks/useClosingValue'

/** Today as YYYY-MM-DD in the customer's own time zone. */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The first day each shared account is filed into the books (step12). The accounts were
 * picked in Plaid Link; Plaid has no start date, so it is asked here. A new connection files
 * nothing until this is saved. Blank = all the history the bank gives (up to 2 years).
 */
export function BankStartDatesDialog({
  connection,
  onClose,
}: {
  connection: BankConnection | null
  onClose: () => void
}) {
  const shown = useClosingValue(connection)
  return (
    <Dialog open={!!connection} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {shown && <StartDatesForm key={shown.id} connection={shown} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function StartDatesForm({ connection, onClose }: { connection: BankConnection; onClose: () => void }) {
  const { t } = useTranslation(['books', 'common'])
  const save = useSaveStartDates()
  const [dates, setDates] = useState<Record<number, string>>(() =>
    Object.fromEntries(connection.accounts.map((a) => [a.id, a.startDate ?? ''])),
  )
  const max = today()
  const first = connection.accounts[0]
  const isNew = !connection.setupAt
  const invalid = Object.values(dates).some((d) => d && (d > max || d < connection.earliestDate))

  const submit = () =>
    save.mutate(
      {
        id: connection.id,
        accounts: connection.accounts.map((a) => ({ id: a.id, startDate: dates[a.id] || null })),
      },
      { onSuccess: onClose },
    )

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('dates.title')}</DialogTitle>
        <DialogDescription>
          {connection.institutionName
            ? t('dates.intro', { bank: connection.institutionName })
            : t('dates.introNoName')}
          {!isNew && ` ${t('dates.later')}`}
        </DialogDescription>
      </DialogHeader>

      {connection.accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dates.none')}</p>
      ) : (
        <ul className="space-y-3">
          {connection.accounts.map((a) => (
            <li key={a.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                {a.kind === 'CREDIT_CARD' ? (
                  <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Landmark className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">
                  {a.name}
                  {a.mask && <span className="text-muted-foreground"> ···{a.mask}</span>}
                </span>
              </span>
              <Input
                type="date"
                aria-label={t('dates.startFor', { name: a.name })}
                className="sm:w-44"
                min={connection.earliestDate}
                max={max}
                value={dates[a.id] ?? ''}
                onChange={(e) => setDates((d) => ({ ...d, [a.id]: e.target.value }))}
              />
            </li>
          ))}
        </ul>
      )}

      {connection.accounts.length > 1 && first && (
        <button
          type="button"
          className="self-start text-xs font-medium text-brand hover:underline"
          onClick={() => {
            const date = dates[first.id] ?? ''
            setDates(Object.fromEntries(connection.accounts.map((a) => [a.id, date])))
          }}
        >
          {t('dates.useFirst')}
        </button>
      )}

      {invalid && (
        <p className="text-sm text-destructive">
          {t('dates.invalid', { date: connection.earliestDate })}
        </p>
      )}
      {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{isNew ? t('dates.laterButton') : t('common:actions.cancel')}</DialogClose>
        <Button disabled={save.isPending || invalid || connection.accounts.length === 0} onClick={submit}>
          {save.isPending ? t('common:actions.saving') : isNew ? t('dates.bringIn') : t('common:actions.save')}
        </Button>
      </DialogFooter>
    </>
  )
}
