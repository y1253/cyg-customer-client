import { useState } from 'react'
import { AlertCircle, CalendarClock, CheckCircle2, ClipboardList, FileBarChart, Loader2, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Frequency, Schedule, ScheduleType } from '@/api/schedules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MonthDaySelect } from '@/components/ui/MonthDaySelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useScheduleActions, useSchedules } from '@/hooks/useSchedules'
import { fmtPhone } from '@/lib/attachment-labels'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const ABOUT: Record<ScheduleType, { title: string; icon: typeof ClipboardList; what: string }> = {
  ACCOUNT_STATUS: {
    title: 'Account Status Overview',
    icon: ClipboardList,
    what:
      'What still needs you: receipts we could not match, Uncategorized transactions, unrecognized names, statements to review. Nothing open = nothing sent.',
  },
  FINANCIAL_REPORT: {
    title: 'Financial Report',
    icon: FileBarChart,
    what: "Last month's income statement and balance sheet — a PDF by email, or a summary and a link by text.",
  },
}

/** The browser's time zone — what "2:00 PM" means to the person choosing it. */
const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
  } catch {
    return 'America/Toronto'
  }
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/**
 * step11b — the Schedules tab: this book's two scheduled messages to the customer, each
 * with its own day and time. A minute cron on the server sends them by the customer's
 * preferred contact (a text for SMS / WhatsApp, else email).
 */
export function SchedulesPanel() {
  const schedules = useSchedules()
  if (schedules.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }
  if (schedules.error) return <p className="text-sm text-destructive">{schedules.error.message}</p>
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarClock className="size-4 text-brand" />
        We can send you a regular update about these books. Pick when; it goes to your preferred contact.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {(schedules.data ?? []).map((s) => (
          <ScheduleCard key={s.type} s={s} />
        ))}
      </div>
    </div>
  )
}

function ScheduleCard({ s }: { s: Schedule }) {
  const { update, sendNow } = useScheduleActions()
  const [frequency, setFrequency] = useState<Frequency>(s.frequency)
  const [weekday, setWeekday] = useState<number>(s.weekday ?? 1)
  const [monthDay, setMonthDay] = useState<number>(s.monthDay ?? 1)
  const [time, setTime] = useState(s.time)
  const about = ABOUT[s.type]
  const Icon = about.icon
  const rule = {
    frequency,
    weekday: frequency === 'WEEKLY' ? weekday : null,
    monthDay: frequency === 'MONTHLY' ? monthDay : null,
    time,
    timezone: browserZone(),
  }
  const changed =
    frequency !== s.frequency ||
    (frequency === 'WEEKLY' ? weekday !== s.weekday : monthDay !== s.monthDay) ||
    time !== s.time
  const busy = update.isPending || sendNow.isPending
  const error = update.error ?? sendNow.error
  const last = s.runs[0]

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{about.title}</CardTitle>
          <CardDescription>{about.what}</CardDescription>
        </div>
        <Switch
          checked={s.enabled}
          disabled={busy}
          aria-label={s.enabled ? `Turn off ${about.title}` : `Turn on ${about.title}`}
          onCheckedChange={(on) => update.mutate({ type: s.type, change: { ...rule, enabled: on } })}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${s.type}-repeat`}>Repeat</Label>
            <Select value={frequency} onValueChange={(v) => v && setFrequency(v as Frequency)}>
              <SelectTrigger id={`${s.type}-repeat`} className="h-9 w-full">
                <SelectValue>{(v: Frequency) => (v === 'WEEKLY' ? 'Every week' : 'Every month')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Every week</SelectItem>
                <SelectItem value="MONTHLY">Every month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${s.type}-day`}>{frequency === 'WEEKLY' ? 'Day' : 'Day of month'}</Label>
            {frequency === 'WEEKLY' ? (
              <Select value={String(weekday)} onValueChange={(v) => v !== null && setWeekday(Number(v))}>
                <SelectTrigger id={`${s.type}-day`} className="h-9 w-full">
                  <SelectValue>{(v: string) => WEEKDAYS[Number(v)]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <MonthDaySelect id={`${s.type}-day`} value={monthDay} onChange={setMonthDay} />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${s.type}-time`}>Time</Label>
            <Input
              id={`${s.type}-time`}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {changed && (
            <Button
              size="sm"
              disabled={busy || !/^\d{2}:\d{2}$/.test(time)}
              onClick={() => update.mutate({ type: s.type, change: rule })}
            >
              {update.isPending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !s.delivery.channel}
            onClick={() => sendNow.mutate(s.type)}
            className="gap-1.5"
          >
            {sendNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send now
          </Button>
          <span className="text-xs text-muted-foreground">
            {s.enabled && s.nextRunAt ? `Next: ${fmtWhen(s.nextRunAt)}` : 'Off'}
          </span>
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Delivery s={s} /> Change your preferred contact on the{' '}
          <Link to="/dashboard/account" className="font-medium text-brand underline-offset-2 hover:underline">
            Account page
          </Link>
          .
        </p>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        {last && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-[#0B1C2C]">Recent</p>
            <ul className="flex flex-col gap-1">
              {s.runs.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  {r.ok ? (
                    <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-px size-3.5 shrink-0 text-red-600" />
                  )}
                  <span>
                    {fmtWhen(r.at)} ·{' '}
                    {r.channel === 'NONE'
                      ? 'not sent'
                      : r.channel === 'SMS'
                        ? 'by text'
                        : r.channel === 'CALL'
                          ? 'by phone call'
                          : 'by email'}
                    {r.manual && ' (send now)'}
                    {r.channel === 'NONE' && r.text ? ` — ${r.text}` : ''}
                    {r.error ? ` — ${r.error}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** "Sends by text to (514) 555-1234 — your preferred contact is WhatsApp." */
function Delivery({ s }: { s: Schedule }) {
  const d = s.delivery
  if (!d.channel) return <>We have no email address or phone to send it to.</>
  if (d.channel === 'CALL') {
    return (
      <>
        The AI assistant <b>calls</b> {fmtPhone(d.to)}, says it, and answers your questions. No answer → a text, then
        email.
      </>
    )
  }
  if (d.channel === 'SMS') {
    return (
      <>
        Sends by <b>text message</b> to {fmtPhone(d.to)}
        {d.preferred === 'WHATSAPP' ? ' (scheduled messages to WhatsApp users go by text).' : '.'}
      </>
    )
  }
  return (
    <>
      Sends by <b>email</b> to {d.to}
      {d.preferred === 'SMS' || d.preferred === 'WHATSAPP' || d.preferred === 'CALL'
        ? ' — add a mobile number to your account to get it by text or call.'
        : '.'}
    </>
  )
}
