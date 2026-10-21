import { useState } from 'react'
import { AlertTriangle, CreditCard, Landmark, Loader2, LogIn, Plus, RefreshCw, Unplug } from 'lucide-react'
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

function statusLine(c: BankConnection): { text: string; tone: 'muted' | 'busy' | 'warn' } {
  if (c.status === 'LOGIN_REQUIRED') return { text: 'Needs you to sign in again', tone: 'warn' }
  if (c.status === 'ERROR') return { text: c.error ?? 'The connection stopped working', tone: 'warn' }
  if (!c.lastSyncAt || !c.historyDone) return { text: 'Bringing in up to 2 years of history…', tone: 'busy' }
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
  if (!enabled) return null
  const list = connections.data ?? []
  const error = connect.error ?? refresh.error ?? disconnect.error

  return (
    <div className={cn('rounded-2xl bg-white p-5 ring-1 ring-black/5', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Landmark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0B1C2C]">Connect your bank</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No more uploading: we bring in your transactions automatically, up to 2 years back, and file each
            month as a statement. Read-only — your bank password goes to Plaid, never to us.
          </p>
        </div>
      </div>

      {list.length > 0 && (
        <ul className="mt-4 space-y-3">
          {list.map((c) => {
            const line = statusLine(c)
            const busy = refresh.isPending && refresh.variables === c.id
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
                      onClick={() => connect.mutate(c.id)}
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
              </li>
            )
          })}
        </ul>
      )}

      <Button className="mt-4 w-full" disabled={connect.isPending} onClick={() => connect.mutate(undefined)}>
        {connect.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        {list.length ? 'Connect another bank' : 'Connect your bank'}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error.message}</p>}

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
