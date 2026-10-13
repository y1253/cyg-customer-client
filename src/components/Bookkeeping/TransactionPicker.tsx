import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Attachment } from '@/api/attachments'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTransactions } from '@/hooks/useTransactions'
import { fmtDay } from '@/lib/attachment-labels'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'

const SHOWN = 60
const toCents = (n: number) => Math.round(n * 100)

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
  return (
    <Dialog open={!!attachment} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-2xl">
        {attachment && <PickerBody key={attachment.id} attachment={attachment} onPick={onPick} pending={pending} />}
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
  const transactions = useTransactions()
  const [query, setQuery] = useState('')
  const want = attachment.total != null ? toCents(attachment.total) : null
  const day = attachment.reading?.date ? Date.parse(attachment.reading.date) : null

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (transactions.data ?? []).filter(
      (t) =>
        !t.kind &&
        (!q ||
          t.description.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          money(t.amount).includes(q)),
    )
    const score = (amount: number, date: string | null) => {
      const off = want != null ? Math.abs(Math.abs(toCents(amount)) - want) : 0
      const gap = day != null && date ? Math.abs(Date.parse(date) - day) / 86_400_000 : 0
      return off * 10 + gap
    }
    return list
      .map((t) => {
        // Splits hide part of a parent's amount here; compare on the full bank amount.
        const full = (transactions.data ?? [])
          .filter((r) => (r.kind === 'tax' || r.kind === 'split') && (r.splitOfId ?? r.id) === t.id)
          .reduce((n, r) => n + toCents(r.amount), toCents(t.amount))
        return { t, full: full / 100 }
      })
      .sort((a, b) =>
        want != null || day != null
          ? score(a.full, a.t.postingDate ?? a.t.pendingDate) - score(b.full, b.t.postingDate ?? b.t.pendingDate)
          : 0,
      )
  }, [transactions.data, query, want, day])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose the transaction</DialogTitle>
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
          placeholder="Search name, description or amount"
          className="h-10 pl-9"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl ring-1 ring-black/5">
        {transactions.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading transactions…</p>
        ) : !rows.length ? (
          <p className="p-4 text-sm text-muted-foreground">No transactions found.</p>
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
