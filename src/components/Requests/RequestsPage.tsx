import { CheckCircle2, Lightbulb } from 'lucide-react'
import type { FeatureRequest, FeatureStatus } from '@/api/featureRequests'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeatureRequests } from '@/hooks/useFeatureRequests'
import { cn } from '@/lib/utils'

const STATUS: Record<FeatureStatus, { label: string; className: string }> = {
  OPEN: { label: 'Received', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  PLANNED: { label: 'Planned', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  DONE: { label: 'Available now', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  DECLINED: { label: 'Not planned', className: 'border-slate-200 bg-white text-muted-foreground' },
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * step12e: "My requests" — when the customer asks the AI assistant for something we don't do
 * yet, it saves the request for the team. The team marks it Planned, Available now or Not
 * planned, with a note; the customer follows it here (and is texted / emailed when it's done).
 */
export function RequestsPage() {
  const requests = useFeatureRequests()
  const list = requests.data ?? []

  return (
    <>
      <PageHeader
        title="My requests"
        description="Things you asked the AI assistant for that we don’t do yet. Our team reviews every one."
      />

      {requests.error ? (
        <p className="text-sm text-destructive">{requests.error.message}</p>
      ) : requests.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !list.length ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-black/5">
          <Lightbulb className="mx-auto size-8 text-brand" />
          <p className="mt-3 font-medium text-[#0B1C2C]">No requests yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            When you ask the assistant for something it can’t do yet, it saves your request here so you can follow it.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </ul>
      )}
    </>
  )
}

function RequestCard({ request: r }: { request: FeatureRequest }) {
  const s = STATUS[r.status] ?? STATUS.OPEN
  const done = r.status === 'DONE'
  return (
    <li
      className={cn(
        'rounded-2xl bg-white px-5 py-4 ring-1 ring-black/5',
        done && 'ring-emerald-200',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {done && <CheckCircle2 className="size-4 text-emerald-600" />}
        <p className="font-medium text-[#0B1C2C]">{r.summary}</p>
        <Badge variant="outline" className={cn('ml-auto', s.className)}>
          {s.label}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">“{r.request}”</p>
      {r.staffNote && (
        <p className="mt-2 rounded-lg bg-brand/5 px-3 py-2 text-sm text-[#0B1C2C]">
          <span className="font-medium">From our team: </span>
          {r.staffNote}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Asked {fmtDate(r.createdAt)}
        {r.book && ` · ${r.book}`}
        {done && r.doneAt && ` · available since ${fmtDate(r.doneAt)}`}
      </p>
    </li>
  )
}
