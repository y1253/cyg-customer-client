import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { isBusy, openOriginal, type Statement } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useDeleteStatement } from '@/hooks/useDeleteStatement'
import { useRetryStatement } from '@/hooks/useRetryStatement'
import { cn } from '@/lib/utils'

// The check against the bank's own totals happens on the server and is kept there; the
// customer only sees the outcome — Done, or Needs review with the reason.
function StatusBadge({ s }: { s: Statement }) {
  if (s.status === 'DONE') {
    return (
      <Badge className="gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
        <CheckCircle2 className="size-3" /> Done
      </Badge>
    )
  }
  if (s.status === 'NEEDS_REVIEW') {
    return (
      <Badge className="gap-1 bg-amber-50 text-amber-800 ring-1 ring-amber-600/25">
        <AlertTriangle className="size-3" /> Needs review
      </Badge>
    )
  }
  if (s.status === 'FAILED') {
    return (
      <Badge className="gap-1 bg-red-50 text-red-700 ring-1 ring-red-600/20">
        <AlertCircle className="size-3" /> Failed
      </Badge>
    )
  }
  if (s.status === 'PROCESSING') {
    return (
      <Badge className="gap-1 bg-brand/10 text-brand ring-1 ring-brand/25">
        <Loader2 className="size-3 animate-spin" /> Reading…
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
      <Clock className="size-3" /> Queued
    </Badge>
  )
}

/** The second line under a statement: what it is, or what is happening to it. */
function subtitle(s: Statement): string {
  switch (s.status) {
    case 'FAILED':
      return s.error ?? 'We could not read this statement.'
    case 'NEEDS_REVIEW':
      return s.error ?? "This statement doesn't match the bank's totals."
    case 'DONE':
      return [`${s.transactionCount} transactions`, s.filename].join(' · ')
    case 'PROCESSING':
      return 'Reading every transaction…'
    default:
      return 'Waiting to be read…'
  }
}

/** Every uploaded statement with its status, newest first. */
export function StatementsList({ statements, loading }: { statements: Statement[]; loading: boolean }) {
  const { token } = useAuth()
  const remove = useDeleteStatement()
  const retry = useRetryStatement()
  const [confirm, setConfirm] = useState<Statement | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
    )
  }

  if (!statements.length) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-center">
        <FileText className="mb-2 size-7 text-muted-foreground/60" />
        <p className="text-sm font-medium text-[#0B1C2C]">No statements yet</p>
        <p className="text-sm text-muted-foreground">Uploaded statements appear here.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
        {statements.map((s) => (
          <li
            key={s.id}
            className={cn(
              'flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-black/5',
              isBusy(s) && 'ring-brand/20',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-[#0B1C2C]" title={s.filename}>
                  {s.label}
                </p>
                <StatusBadge s={s} />
              </div>
              <p
                className={cn(
                  'text-xs',
                  // The needs-review reason is the customer's only explanation — never cut it off.
                  s.status === 'NEEDS_REVIEW' ? 'mt-0.5 text-amber-800' : 'truncate text-muted-foreground',
                )}
                title={subtitle(s)}
              >
                {subtitle(s)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {(s.status === 'FAILED' || s.status === 'NEEDS_REVIEW') && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Try again"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(s.id)}
                >
                  <RotateCcw />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                title="View original PDF"
                onClick={() => {
                  setOpenError(null)
                  openOriginal(token!, s.id).catch((e: Error) => setOpenError(e.message))
                }}
              >
                <ExternalLink />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Delete statement"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirm(s)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {openError && <p className="mt-2 text-sm text-destructive">{openError}</p>}

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this statement?</DialogTitle>
            <DialogDescription>
              {confirm?.filename} and its {confirm?.transactionCount ?? 0} transactions will be removed
              from your ledger and exports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                confirm && remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })
              }
            >
              {remove.isPending ? 'Deleting…' : 'Delete statement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
