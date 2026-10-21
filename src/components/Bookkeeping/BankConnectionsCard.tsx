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
import { cn } from '@/lib/utils'
import { BankStartDatesDialog } from './BankStartDatesDialog'

/** "5 min ago", "yesterday", "Oct 3". */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "Mar 1, 2025" from YYYY-MM-DD. */
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLine(c: BankConnection): { text: string; tone: 'muted' | 'busy' | 'warn' } {
  if (c.status === 'LOGIN_REQUIRED') return { text: 'Needs you to sign in again', tone: 'warn' }
  if (c.status === 'ERROR') return { text: c.error ?? 'The connection stopped working', tone: 'warn' }
  if (!c.setupAt) return { text: 'Pick where each account starts — nothing is filed until you do', tone: 'warn' }
  if (!c.lastSyncAt || !c.historyDone) return { text: 'Bringing in your history…', tone: 'busy' }
  return { text: `Up to date · ${ago(c.lastSyncAt)}`, tone: 'muted' }
}

/**
 * "Connect your bank" (step11): instead of uploading statements, the customer connects a bank
 * through Plaid. Every month becomes a statement on its own, kept current as the bank sends
 * new transactions. Renders nothing while bank feeds are not set up on the server.
 */
export function BankConnectionsCard({ className }: { className?: string }) {
  const enabled = useBankFeedsEnabled()
  const connections = useBankConnections(enabled)
  const connect = useConnectBank()
  const refresh = useRefreshBank()
  const disconnect = useDisconnectBank()
  const [confirm, setConfirm] = useState<BankConnection | null>(null)
  const [datesFor, setDatesFor] = useState<BankConnection | null>(null)
  /** New connections whose start-date dialog was closed with "Later" (not reopened by itself). */
  const [later, setLater] = useState<number[]>([])
  const list = connections.data ?? []
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
          <p className="font-semibold text-[#0B1C2C]">Connect your bank</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No more uploading: you pick the accounts at your bank and how far back (up to 2 years), and we file
            each month as a statement automatically. Read-only — your bank password goes to Plaid, never to us.
          </p>
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
                    {c.institutionName ?? 'Your bank'}
                  </p>
                  {c.status === 'LOGIN_REQUIRED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={connect.isPending}
                      onClick={() => connect.mutate({ itemId: c.id })}
                    >
                      <LogIn /> Sign in again
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Refresh now"
                      disabled={busy}
                      onClick={() => refresh.mutate(c.id)}
                    >
                      <RefreshCw className={cn(busy && 'animate-spin')} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Disconnect"
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
                {c.newAccounts && c.status === 'ACTIVE' && (
                  <p className="mt-1 text-xs text-amber-700">
                    Your bank has an account you have not shared yet.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      disabled={connect.isPending}
                      onClick={() => chooseAccounts(c)}
                    >
                      Add it
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
                        <span className="min-w-0 flex-1 truncate" title={`Filed under “${a.accountName}”`}>
                          {a.accountName}
                          {c.setupAt && (
                            <span className="text-muted-foreground">
                              {' '}
                              · {a.startDate ? `from ${dayLabel(a.startDate)}` : 'all history'}
                            </span>
                          )}
                        </span>
                        {a.currentBalance !== null && (
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {a.kind === 'CREDIT_CARD' ? 'owed ' : ''}
                            {money(a.currentBalance)} {a.currency ?? ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {c.status === 'ACTIVE' && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button size="xs" variant="ghost" disabled={connect.isPending} onClick={() => chooseAccounts(c)}>
                      <ListChecks /> Change accounts
                    </Button>
                    <Button
                      size="xs"
                      variant={c.setupAt ? 'ghost' : 'default'}
                      disabled={c.accounts.length === 0}
                      onClick={() => setDatesFor(c)}
                    >
                      <CalendarDays /> Start dates
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
        {list.length ? 'Connect another bank' : 'Connect your bank'}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error.message}</p>}

      <BankStartDatesDialog connection={dialogFor} onClose={closeDates} />

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {confirm?.institutionName ?? 'this bank'}?</DialogTitle>
            <DialogDescription>
              We stop bringing in new transactions and delete our access to it. The statements already
              imported stay in your books.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => confirm && disconnect.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
            >
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
