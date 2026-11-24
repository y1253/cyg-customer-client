import { useState } from 'react'
import { CalendarClock, ClipboardList, FileBarChart, Loader2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import i18n from '@/i18n'
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

const ICON: Record<ScheduleType, typeof ClipboardList> = {
  ACCOUNT_STATUS: ClipboardList,
  FINANCIAL_REPORT: FileBarChart,
}
const about = (type: ScheduleType) => ({
  title: i18n.t(`books:schedules.builtin.${type}.title`),
  icon: ICON[type],
  what: i18n.t(`books:schedules.builtin.${type}.what`),
})

/** "by text to (514) 555-1234" — the row's short version. */
function shortDelivery(d: { channel: string | null; to: string | null }) {
  if (!d.channel || !d.to) return i18n.t('books:schedules.to.nowhere')
  if (d.channel === 'CALL') return i18n.t('books:schedules.to.call', { to: fmtPhone(d.to) })
  if (d.channel === 'SMS') return i18n.t('books:schedules.to.sms', { to: fmtPhone(d.to) })
  return i18n.t('books:schedules.to.email', { to: d.to })
}

const accountLink = <Link to="/dashboard/account" className="font-medium text-brand underline-offset-2 hover:underline" />

/** The long version under a built-in schedule's settings. */
function BuiltInDelivery({ s }: { s: Schedule }) {
  const { t } = useTranslation(['books', 'common'])
  const d = s.delivery
  const b = { b: <b /> }
  let what: React.ReactNode
  if (!d.channel) what = t('schedules.delivery.nowhere')
  else if (d.channel === 'CALL')
    what = <Trans t={t} i18nKey="schedules.delivery.builtinCall" values={{ to: fmtPhone(d.to) }} components={b} />
  else if (d.channel === 'SMS')
    what = (
      <Trans
        t={t}
        i18nKey={d.preferred === 'WHATSAPP' ? 'schedules.delivery.builtinSmsWhatsapp' : 'schedules.delivery.builtinSms'}
        values={{ to: fmtPhone(d.to) }}
        components={b}
      />
    )
  else
    what = (
      <Trans
        t={t}
        i18nKey={
          d.preferred === 'SMS' || d.preferred === 'WHATSAPP' || d.preferred === 'CALL'
            ? 'schedules.delivery.builtinEmailAddPhone'
            : 'schedules.delivery.builtinEmail'
        }
        values={{ to: d.to }}
        components={b}
      />
    )
  return (
    <>
      {what} <Trans t={t} i18nKey="schedules.delivery.changePreferred" components={{ link: accountLink }} />
    </>
  )
}

function AiDelivery({ s }: { s: AiSchedule }) {
  const { t } = useTranslation(['books', 'common'])
  const d = s.delivery
  const b = { b: <b /> }
  // How the channel was picked: their preferred contact, or a call that is not available.
  const why =
    s.channel === null
      ? t('schedules.delivery.preferred')
      : s.channel === 'CALL' && d.channel !== 'CALL'
        ? t('schedules.delivery.noCalls')
        : ''
  return (
    <>
      {d.channel === 'CALL' ? t('schedules.delivery.aiPrepares') : t('schedules.delivery.aiWrites')}{' '}
      {!d.channel ? (
        t('schedules.delivery.nowhere')
      ) : d.channel === 'CALL' ? (
        <Trans t={t} i18nKey="schedules.delivery.aiCall" values={{ to: fmtPhone(d.to), why }} components={b} />
      ) : (
        <Trans
          t={t}
          i18nKey={d.channel === 'SMS' ? 'schedules.delivery.aiSms' : 'schedules.delivery.aiEmail'}
          values={{ to: d.channel === 'SMS' ? fmtPhone(d.to) : d.to, why }}
          components={b}
        />
      )}{' '}
      <Trans t={t} i18nKey="schedules.delivery.changeContact" components={{ link: accountLink }} />
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
  const { t } = useTranslation(['books', 'common'])
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
          <CalendarClock className="size-5 text-brand" /> {t('schedules.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('schedules.intro')}
        </p>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <SectionHeader title={t('schedules.builtIn')} count={(builtIn.data ?? []).length} />
        <ul className="divide-y">
          {(builtIn.data ?? []).map((s) => (
            <BuiltInRow key={s.type} s={s} open={open === s.type} onToggle={() => toggle(s.type)} />
          ))}
        </ul>

        <SectionHeader title={t('schedules.askedInChat')} count={own.length} />
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
              <p className="font-medium text-[#0B1C2C]">{t('schedules.noCustom')}</p>
              <p className="text-muted-foreground">
                {assistantOn ? (
                  <Trans t={t} i18nKey="schedules.askHint" components={{ i: <i /> }} />
                ) : (
                  t('schedules.askHintOff')
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
  const { t } = useTranslation(['books', 'common'])
  const info = about(s.type)
  const Icon = info.icon
  const rule = {
    frequency: s.frequency,
    weekday: s.weekday ?? 1,
    monthDay: s.monthDay ?? 1,
    time: s.time,
    date: '',
  }
  const error = sendNow.error ?? (open ? null : update.error)
  return (
    <ScheduleRow
      icon={<Icon className="size-5" />}
      title={info.title}
      badge={{ label: t('schedules.builtIn'), tone: 'muted' }}
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
      <BuiltInEditor s={s} about={info.what} note={<BuiltInDelivery s={s} />} />
    </ScheduleRow>
  )
}

function AiRow({ s, open, onToggle }: { s: AiSchedule; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation(['books', 'common'])
  const { update, sendNow, remove } = useAiScheduleActions()
  const [confirm, setConfirm] = useState(false)
  const error = sendNow.error ?? (open ? null : update.error)
  return (
    <>
      <ScheduleRow
        icon={<Sparkles className="size-5" />}
        title={s.title}
        badge={{ label: s.createdBy === 'AI' ? t('schedules.madeByAi') : t('schedules.yours'), tone: 'brand' }}
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
            <DialogTitle>{t('schedules.deleteTitle', { title: s.title })}</DialogTitle>
            <DialogDescription>{t('schedules.deleteText')}</DialogDescription>
          </DialogHeader>
          {remove.error && <p className="text-sm text-destructive">{remove.error.message}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t('schedules.keep')}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(s.id, { onSuccess: () => setConfirm(false) })}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />} {t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
