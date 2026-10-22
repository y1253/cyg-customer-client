import { useState } from 'react'
import { CalendarClock, ClipboardList, FileBarChart, Loader2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AiSchedule, Schedule, ScheduleType } from '@/api/schedules'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useAiScheduleActions, useAiSchedules, useScheduleActions, useSchedules } from '@/hooks/useSchedules'
import { fmtPhone } from '@/lib/attachment-labels'
import { AiEditor, BuiltInEditor } from './ScheduleEditor'
import { ruleChange } from './schedule-format'
import { ScheduleRow } from './ScheduleRow'

const ABOUT: Record<ScheduleType, { title: string; icon: typeof ClipboardList; what: string }> = {
  ACCOUNT_STATUS: {
    title: 'Account Status Overview',
    icon: ClipboardList,
    what: 'What still needs you: receipts we could not match, Uncategorized transactions, unrecognized names, statements to review. Nothing open = nothing sent.',
  },
  FINANCIAL_REPORT: {
    title: 'Financial Report',
    icon: FileBarChart,
    what: "Last month's income statement and balance sheet — a PDF by email, or a summary and a link by text.",
  },
}

/** "by text to (514) 555-1234" — the row's short version. */
function shortDelivery(d: { channel: string | null; to: string | null }) {
  if (!d.channel || !d.to) return 'nowhere to send it'
  if (d.channel === 'CALL') return `by phone call to ${fmtPhone(d.to)}`
  if (d.channel === 'SMS') return `by text to ${fmtPhone(d.to)}`
  return `by email to ${d.to}`
}

const AccountLink = () => (
  <Link to="/dashboard/account" className="font-medium text-brand underline-offset-2 hover:underline">
    Account page
  </Link>
)

/** The long version under a built-in schedule's settings. */
function BuiltInDelivery({ s }: { s: Schedule }) {
  const d = s.delivery
  let what: React.ReactNode
  if (!d.channel) what = 'We have no email address or phone to send it to.'
  else if (d.channel === 'CALL')
    what = (
      <>
        The AI assistant <b>calls</b> {fmtPhone(d.to)}, says it, and answers your questions. No answer → a text, then
        email.
      </>
    )
  else if (d.channel === 'SMS')
    what = (
      <>
        Sends by <b>text message</b> to {fmtPhone(d.to)}
        {d.preferred === 'WHATSAPP' ? ' (scheduled messages to WhatsApp users go by text).' : '.'}
      </>
    )
  else
    what = (
      <>
        Sends by <b>email</b> to {d.to}
        {d.preferred === 'SMS' || d.preferred === 'WHATSAPP' || d.preferred === 'CALL'
          ? ' — add a mobile number to your account to get it by text or call.'
          : '.'}
      </>
    )
  return (
    <>
      {what} Change your preferred contact on the <AccountLink />.
    </>
  )
}

function AiDelivery({ s }: { s: AiSchedule }) {
  const d = s.delivery
  return (
    <>
      Each time, the AI assistant looks up your books and writes the message.{' '}
      {!d.channel ? (
        'We have no email address or phone to send it to.'
      ) : (
        <>
          It goes by{' '}
          <b>{d.channel === 'SMS' ? 'text message' : 'email'}</b> to {d.channel === 'SMS' ? fmtPhone(d.to) : d.to}
          {s.channel === null ? ' — your preferred contact (a phone-call preference gets a text).' : '.'}
        </>
      )}{' '}
      Change your contact details on the <AccountLink />.
    </>
  )
}

/**
 * step11b + step12 — the Schedules tab: everything this book sends the customer on a
 * schedule, as one list of rows. The two built-ins first, then the ones they asked the AI
 * assistant for ("text me my financial report every day at 6am"). A minute cron on the
 * server sends them.
 */
export function SchedulesPanel() {
  const builtIn = useSchedules()
  const custom = useAiSchedules()
  const assistantOn = useAssistantEnabled()
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (key: string) => setOpen((o) => (o === key ? null : key))

  if (builtIn.isLoading || custom.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  const error = builtIn.error ?? custom.error
  if (error) return <p className="text-sm text-destructive">{error.message}</p>

  const own = custom.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#0B1C2C]">
          <CalendarClock className="size-5 text-brand" /> Scheduled messages
        </h2>
        <p className="text-sm text-muted-foreground">
          Regular updates about these books, sent to you by text or email. Click a row to change it.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <SectionHeader title="Built-in" count={(builtIn.data ?? []).length} />
        <ul className="divide-y">
          {(builtIn.data ?? []).map((s) => (
            <BuiltInRow key={s.type} s={s} open={open === s.type} onToggle={() => toggle(s.type)} />
          ))}
        </ul>

        <SectionHeader title="Asked for in chat" count={own.length} />
        {own.length ? (
          <ul className="divide-y">
            {own.map((s) => (
              <AiRow key={s.id} s={s} open={open === `ai-${s.id}`} onToggle={() => toggle(`ai-${s.id}`)} />
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Sparkles className="size-5" />
            </span>
            <div className="text-sm">
              <p className="font-medium text-[#0B1C2C]">No custom schedules yet</p>
              <p className="text-muted-foreground">
                {assistantOn ? (
                  <>
                    Ask the AI assistant — by chat, text or email — for anything regular, like{' '}
                    <i>“Text me my cash balance every day at 6am”</i> or{' '}
                    <i>“Email me unmatched receipts every Friday”</i>. It shows up here.
                  </>
                ) : (
                  'Schedules you ask the AI assistant for will show up here.'
                )}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 sm:px-5 [&:not(:first-child)]:border-t">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="text-xs text-muted-foreground">{count}</p>
    </div>
  )
}

function BuiltInRow({ s, open, onToggle }: { s: Schedule; open: boolean; onToggle: () => void }) {
  const { update, sendNow } = useScheduleActions()
  const about = ABOUT[s.type]
  const Icon = about.icon
  const rule = {
    frequency: s.frequency,
    weekday: s.weekday ?? 1,
    monthDay: s.monthDay ?? 1,
    time: s.time,
  }
  const error = sendNow.error ?? (open ? null : update.error)
  return (
    <ScheduleRow
      icon={<Icon className="size-5" />}
      title={about.title}
      badge={{ label: 'Built-in', tone: 'muted' }}
      when={s.description}
      delivery={shortDelivery(s.delivery)}
      on={s.enabled}
      nextRunAt={s.nextRunAt}
      busy={update.isPending || sendNow.isPending}
      canSend={!!s.delivery.channel}
      sending={sendNow.isPending}
      open={open}
      onToggleOpen={onToggle}
      onSwitch={(on) =>
        update.mutate({
          type: s.type,
          change: { ...ruleChange(rule), frequency: s.frequency, enabled: on },
        })
      }
      onSendNow={() => sendNow.mutate(s.type)}
    >
      {error && <p className="mb-3 text-sm text-destructive">{error.message}</p>}
      <BuiltInEditor s={s} about={about.what} note={<BuiltInDelivery s={s} />} />
    </ScheduleRow>
  )
}

function AiRow({ s, open, onToggle }: { s: AiSchedule; open: boolean; onToggle: () => void }) {
  const { update, sendNow, remove } = useAiScheduleActions()
  const [confirm, setConfirm] = useState(false)
  const error = sendNow.error ?? (open ? null : update.error)
  return (
    <>
      <ScheduleRow
        icon={<Sparkles className="size-5" />}
        title={s.title}
        badge={{ label: s.createdBy === 'AI' ? 'Made by AI' : 'Yours', tone: 'brand' }}
        when={s.description}
        delivery={shortDelivery(s.delivery)}
        on={s.active}
        nextRunAt={s.nextRunAt}
        busy={update.isPending || sendNow.isPending || remove.isPending}
        canSend={!!s.delivery.channel}
        sending={sendNow.isPending}
        open={open}
        onToggleOpen={onToggle}
        onSwitch={(on) => update.mutate({ id: s.id, change: { active: on } })}
        onSendNow={() => sendNow.mutate(s.id)}
        onDelete={() => setConfirm(true)}
      >
        {error && <p className="mb-3 text-sm text-destructive">{error.message}</p>}
        <AiEditor s={s} note={<AiDelivery s={s} />} />
      </ScheduleRow>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{s.title}”?</DialogTitle>
            <DialogDescription>
              It stops being sent. You can always ask the assistant for it again.
            </DialogDescription>
          </DialogHeader>
          {remove.error && <p className="text-sm text-destructive">{remove.error.message}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(s.id, { onSuccess: () => setConfirm(false) })}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
