import { useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Landmark,
  ListChecks,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  Unplug,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n, { currentLocale } from '@/i18n'
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
import {
  useBankConnections,
  useBankFeedsEnabled,
  useConnectBank,
  useDisconnectBank,
  useRefreshBank,
} from '@/hooks/useBankFeeds'
import { money } from '@/lib/money'
import { fmtDay } from '@/lib/period'
import { useStatements } from '@/hooks/useStatements'
import { startsByFolder } from './statement-folders'
import { cn } from '@/lib/utils'
import { BankStartDatesDialog } from './BankStartDatesDialog'

/** "5 min ago", "yesterday", "Oct 3". */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return i18n.t('books:bank.justNow')
  if (mins < 60) return i18n.t('books:bank.minAgo', { n: mins })
  const hours = Math.round(mins / 60)
  if (hours < 24) return i18n.t('books:bank.hoursAgo', { n: hours })
  if (hours < 48) return i18n.t('books:bank.yesterday')
  return new Date(iso).toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric' })
}

/** "Mar 1, 2025" from YYYY-MM-DD. */
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLine(c: BankConnection): { text: string; tone: 'muted' | 'busy' | 'warn' } {
  // step8: `error` is what happened and what to do, in plain words (the raw text is "Details").
  if (c.status === 'LOGIN_REQUIRED') return { text: c.error ?? i18n.t('books:bank.signInNeeded'), tone: 'warn' }
  if (c.status === 'ERROR') return { text: c.error ?? i18n.t('books:bank.stopped'), tone: 'warn' }
  if (!c.setupAt) return { text: i18n.t('books:bank.pickStarts'), tone: 'warn' }
  // An ACTIVE item's error = why the bank has sent nothing yet (e.g. it is down at Plaid).
  if (!c.historyDone && c.error) return { text: c.error, tone: 'warn' }
  if (!c.lastSyncAt || !c.historyDone) return { text: i18n.t('books:bank.bringingIn'), tone: 'busy' }
  return { text: i18n.t('books:bank.upToDate', { ago: ago(c.lastSyncAt) }), tone: 'muted' }
}

/**
 * "Connect your bank" (step11): instead of uploading statements, the customer connects a bank
 * through Plaid. Every month becomes a statement on its own, kept current as the bank sends
 * new transactions. Renders nothing while bank feeds are not set up on the server.
 */
export function BankConnectionsCard({ className }: { className?: string }) {
  const { t } = useTranslation(['books', 'common'])
  const enabled = useBankFeedsEnabled()
  const connections = useBankConnections(enabled)
  const connect = useConnectBank()
  const refresh = useRefreshBank()
  const disconnect = useDisconnectBank()
  const [confirm, setConfirm] = useState<BankConnection | null>(null)
  const [datesFor, setDatesFor] = useState<BankConnection | null>(null)
  /** New connections whose start-date dialog was closed with "Later" (not reopened by itself). */
  const [later, setLater] = useState<number[]>([])
  const [detailFor, setDetailFor] = useState<number | null>(null)
  const list = connections.data ?? []
  // step2 (2026-11-12): where each account's books start — its folder's first starting balance.
  const starts = startsByFolder(useStatements().data ?? [])
  const error = connect.error ?? refresh.error ?? disconnect.error
  if (!enabled) return null

  // A new connection waits for its start dates (also one finished on /plaid/oauth): its
  // dialog opens by itself. Otherwise the freshest copy of the one the customer opened.
  const waiting = list.find((c) => c.status === 'ACTIVE' && !c.setupAt && !later.includes(c.id))
  const dialogFor = datesFor ? (list.find((c) => c.id === datesFor.id) ?? datesFor) : (waiting ?? null)
  const closeDates = () => {
    if (dialogFor && !dialogFor.setupAt) setLater((l) => [...l, dialogFor.id])
    setDatesFor(null)
  }

  /** Plaid Link's Account Select on this bank; a newly shared account asks for its date. */
  const chooseAccounts = (c: BankConnection) => {
    const before = new Set(c.accounts.map((a) => a.id))
    connect.mutate(
      { itemId: c.id, chooseAccounts: true },
      { onSuccess: (next) => next && next.accounts.some((a) => !before.has(a.id)) && setDatesFor(next) },
    )
  }

  return (
    <div className={cn('rounded-2xl bg-white p-5 ring-1 ring-black/5', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Landmark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0B1C2C]">{t('bank.connect')}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('bank.intro')}</p>
        </div>
      </div>

      {list.length > 0 && (
        <ul className="mt-4 space-y-3">
          {list.map((c) => {
            const line = statusLine(c)
            const busy = c.syncing || (refresh.isPending && refresh.variables === c.id)
            return (
              <li key={c.id} className="rounded-xl bg-[#F6F8FA] p-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0B1C2C]">
                    {c.institutionName ?? t('bank.yourBank')}
                  </p>
                  {c.status === 'LOGIN_REQUIRED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={connect.isPending}
                      onClick={() => connect.mutate({ itemId: c.id })}
                    >
                      <LogIn /> {t('bank.signInAgain')}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('bank.refreshNow')}
                      disabled={busy}
                      onClick={() => refresh.mutate(c.id)}
                    >
                      <RefreshCw className={cn(busy && 'animate-spin')} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t('bank.disconnect')}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirm(c)}
                  >
                    <Unplug />
                  </Button>
                </div>
                <p
                  className={cn(
                    'mt-0.5 flex items-center gap-1.5 text-xs',
                    line.tone === 'warn' ? 'text-amber-700' : 'text-muted-foreground',
                  )}
                >
                  {line.tone === 'busy' && <Loader2 className="size-3 animate-spin" />}
                  {line.tone === 'warn' && <AlertTriangle className="size-3.5 shrink-0" />}
                  {line.text}
                </p>
                {c.status !== 'ACTIVE' && c.errorDetail && (
                  <div className="mt-0.5 pl-5 text-xs">
                    <button
                      type="button"
                      className="font-medium text-brand hover:underline"
                      onClick={() => setDetailFor(detailFor === c.id ? null : c.id)}
                    >
                      {detailFor === c.id ? t('statements.hideDetails') : t('statements.details')}
                    </button>
                    {detailFor === c.id && (
                      <p className="mt-0.5 font-mono break-words text-muted-foreground">{c.errorDetail}</p>
                    )}
                  </div>
                )}
                {c.status === 'ACTIVE' && !c.historyDone && c.error && (
                  <p className="mt-0.5 pl-5 text-xs text-muted-foreground">
                    {t('bank.dontDisconnect')}
                  </p>
                )}
                {refresh.data?.id === c.id && refresh.data.refreshNote && (
                  <p className="mt-0.5 pl-5 text-xs text-muted-foreground">{refresh.data.refreshNote}</p>
                )}
                {c.newAccounts && c.status === 'ACTIVE' && (
                  <p className="mt-1 text-xs text-amber-700">
                    {t('bank.newAccount')}{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      disabled={connect.isPending}
                      onClick={() => chooseAccounts(c)}
                    >
                      {t('bank.addIt')}
                    </button>
                  </p>
                )}
                {c.accounts.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {c.accounts.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-xs">
                        {a.kind === 'CREDIT_CARD' ? (
                          <CreditCard className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <Landmark className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate" title={t('bank.filedUnder', { name: a.accountName })}>
                          {a.accountName}
                          {c.setupAt && (
                            <span className="text-muted-foreground">
                              {' '}
                              · {a.startDate ? t('bank.from', { date: dayLabel(a.startDate) }) : t('bank.allHistory')}
                            </span>
                          )}
                          {(() => {
                            const first = starts.get(a.accountName)?.[0]
                            if (first?.amount === undefined) return null
                            return (
                              <span className="text-muted-foreground">
                                {' '}
                                ·{' '}
                                {t(
                                  first.date
                                    ? a.kind === 'CREDIT_CARD'
                                      ? 'bank.startOwedOn'
                                      : 'bank.startOn'
                                    : a.kind === 'CREDIT_CARD'
                                      ? 'bank.startOwed'
                                      : 'bank.start',
                                  { amount: money(first.amount), date: first.date ? fmtDay(first.date) : '' },
                                )}
                              </span>
                            )
                          })()}
                        </span>
                        {a.currentBalance !== null && (
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {a.kind === 'CREDIT_CARD'
                              ? t('bank.owed', { amount: money(a.currentBalance) })
                              : money(a.currentBalance)}{' '}
                            {a.currency ?? ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {c.status === 'ACTIVE' && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button size="xs" variant="ghost" disabled={connect.isPending} onClick={() => chooseAccounts(c)}>
                      <ListChecks /> {t('bank.changeAccounts')}
                    </Button>
                    <Button
                      size="xs"
                      variant={c.setupAt ? 'ghost' : 'default'}
                      disabled={c.accounts.length === 0}
                      onClick={() => setDatesFor(c)}
                    >
                      <CalendarDays /> {t('bank.startDates')}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Button className="mt-4 w-full" disabled={connect.isPending} onClick={() => connect.mutate({})}>
        {connect.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        {list.length ? t('bank.connectAnother') : t('bank.connect')}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error.message}</p>}

      <BankStartDatesDialog connection={dialogFor} onClose={closeDates} />

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.institutionName
                ? t('bank.disconnectTitle', { name: confirm.institutionName })
                : t('bank.disconnectThis')}
            </DialogTitle>
            <DialogDescription>{t('bank.disconnectText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            <Button
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => confirm && disconnect.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
            >
              {disconnect.isPending ? t('bank.disconnecting') : t('bank.disconnect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
