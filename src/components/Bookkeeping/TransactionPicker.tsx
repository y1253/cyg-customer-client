import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import type { Attachment } from '@/api/attachments'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useClosingValue } from '@/hooks/useClosingValue'
import { useDebounced } from '@/hooks/useDebounced'
import { useLedgerPages } from '@/hooks/useLedgerPages'
import { fmtDay } from '@/lib/attachment-labels'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'

const SHOWN = 60

/**
 * Choose the transaction an attachment belongs to. Transactions only (no splits, tax lines
 * or starting balances); the ones whose amount and date are closest to what was read come first.
 */
export function TransactionPicker({
  attachment,
  onOpenChange,
  onPick,
  pending,
}: {
  attachment: Attachment | null
  onOpenChange: (open: boolean) => void
  onPick: (transactionId: number) => void
  pending?: boolean
}) {
  const shown = useClosingValue(attachment)
  return (
    <Dialog open={!!attachment} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-2xl">
        {shown && <PickerBody key={shown.id} attachment={shown} onPick={onPick} pending={pending} />}
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({
  attachment,
  onPick,
  pending,
}: {
  attachment: Attachment
  onPick: (transactionId: number) => void
  pending?: boolean
}) {
  const { t: tr } = useTranslation('ledger')
  const [query, setQuery] = useState('')
  // step11 (2026-11-23): searched and ranked on the server — closest amount and day first,
  // on the full bank amount (splits added back).
  const searched = useDebounced(query.trim(), 300)
  const ledgerQuery = useMemo(
    () => ({
      q: searched || undefined,
      near: { amount: attachment.total ?? null, date: attachment.reading?.date ?? null },
    }),
    [searched, attachment.total, attachment.reading?.date],
  )
  const transactions = useLedgerPages(ledgerQuery)
  const rows = useMemo(
    () =>
      (transactions.data?.pages[0]?.rows ?? [])
        .filter((t) => !t.kind)
        .map((t) => ({ t, full: t.fullAmount ?? t.amount })),
    [transactions.data],
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>{tr('picker.title')}</DialogTitle>
        <DialogDescription>
          {attachment.filename}
          {attachment.total != null && ` · ${money(attachment.total)}`}
          {attachment.reading?.date && ` · ${fmtDay(attachment.reading.date)}`}
        </DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('picker.search')}
          className="h-10 pl-9"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl ring-1 ring-black/5">
        {transactions.isPending ? (
          <p className="p-4 text-sm text-muted-foreground">{tr('picker.loading')}</p>
        ) : !rows.length ? (
          <p className="p-4 text-sm text-muted-foreground">{tr('picker.none')}</p>
        ) : (
          <ul className="divide-y">
            {rows.slice(0, SHOWN).map(({ t, full }) => (
              <li key={t.key}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onPick(t.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand/5 disabled:opacity-60"
                >
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {fmtDay(t.postingDate ?? t.pendingDate)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#0B1C2C]">{t.name ?? t.description}</span>
                    {t.name && <span className="block truncate text-xs text-muted-foreground">{t.description}</span>}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      full < 0 ? 'text-red-600' : 'text-emerald-700',
                    )}
                  >
                    {money(full)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
