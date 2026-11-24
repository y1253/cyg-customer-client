import { useState, type FormEvent } from 'react'
import { CheckCircle2, Lightbulb, Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FeatureRequest, FeatureStatus } from '@/api/featureRequests'
import { PageHeader } from '@/components/Dashboard/PageHeader'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCreateFeatureRequest, useFeatureRequests } from '@/hooks/useFeatureRequests'
import i18n, { currentLocale } from '@/i18n'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<FeatureStatus, string> = {
  OPEN: 'border-slate-200 bg-slate-50 text-slate-700',
  PLANNED: 'border-sky-200 bg-sky-50 text-sky-700',
  DONE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DECLINED: 'border-slate-200 bg-white text-muted-foreground',
}
const statusLabel = (s: FeatureStatus) => i18n.t(`dashboard:requests.status.${s}`)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * step12e: "My requests" — when the customer asks the AI assistant for something we don't do
 * yet, it saves the request for the team. The team marks it Planned, Available now or Not
 * planned, with a note; the customer follows it here (and is texted / emailed when it's done).
 * The customer can also type a request here directly ("New request").
 */
export function RequestsPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const requests = useFeatureRequests()
  const list = requests.data ?? []
  const [asking, setAsking] = useState(false)

  const newButton = (
    <Button onClick={() => setAsking(true)} className="bg-brand text-white hover:bg-brand/85">
      <Plus className="size-4" />
      {t('requests.new')}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={t('requests.title')}
        description={t('requests.description')}
        actions={newButton}
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
          <p className="mt-3 font-medium text-[#0B1C2C]">{t('requests.emptyTitle')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {t('requests.emptyText')}
          </p>
          <div className="mt-5">{newButton}</div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </ul>
      )}

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>{asking && <RequestForm onDone={() => setAsking(false)} />}</DialogContent>
      </Dialog>
    </>
  )
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const create = useCreateFeatureRequest()
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!summary.trim()) return
    create.mutate(
      { summary: summary.trim(), request: details.trim() || undefined },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle>{t('requests.new')}</DialogTitle>
        <DialogDescription>{t('requests.formDescription')}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="request-summary">{t('requests.what')}</Label>
          <Input
            id="request-summary"
            autoFocus
            maxLength={200}
            placeholder={t('requests.whatPlaceholder')}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="request-details">{t('requests.details')}</Label>
          <Textarea
            id="request-details"
            rows={4}
            maxLength={4000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
        {create.error && (
          <p role="alert" className="text-sm text-destructive">
            {create.error.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
        <Button
          type="submit"
          disabled={create.isPending || !summary.trim()}
          className="bg-brand text-white hover:bg-brand/85"
        >
          {create.isPending && <Loader2 className="size-4 animate-spin" />}
          {t('requests.send')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function RequestCard({ request: r }: { request: FeatureRequest }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const status: FeatureStatus = r.status in STATUS_CLASS ? r.status : 'OPEN'
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
        <Badge variant="outline" className={cn('ml-auto', STATUS_CLASS[status])}>
          {statusLabel(status)}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">“{r.request}”</p>
      {r.staffNote && (
        <p className="mt-2 rounded-lg bg-brand/5 px-3 py-2 text-sm text-[#0B1C2C]">
          <span className="font-medium">{t('requests.fromTeam')} </span>
          {r.staffNote}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {t('requests.asked', { date: fmtDate(r.createdAt) })}
        {r.book && ` · ${r.book}`}
        {done && r.doneAt && ` · ${t('requests.availableSince', { date: fmtDate(r.doneAt) })}`}
      </p>
    </li>
  )
}
