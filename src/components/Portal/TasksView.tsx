import { useState, type ReactNode } from 'react'
import { CalendarClock, CheckCircle2, ChevronDown, ListChecks, Repeat, StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PortalSchedule, PortalTodo, PortalTodoStatus } from '@/api/portal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import i18n, { currentLocale } from '@/i18n'
import { usePortalTasks } from '@/hooks/usePortal'
import { cycleLabel } from '@/lib/cycle'
import { cn } from '@/lib/utils'

/**
 * What our team is working on for this business: open and recently completed tasks with
 * their status, and the recurring schedules behind them. Read-only. The task descriptions
 * are the firm's own instructions and never reach this page — only the notes written for
 * this company do.
 */
export function TasksView({ companyId }: { companyId: number }) {
  const { t } = useTranslation(['portal', 'common'])
  const tasks = usePortalTasks(companyId)

  if (tasks.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }
  if (tasks.isError) return <p className="text-sm text-destructive">{tasks.error.message}</p>

  const { todos, schedules } = tasks.data
  const open = todos
    .filter((td) => OPEN_ORDER[td.status] !== undefined)
    .sort((a, b) => OPEN_ORDER[a.status]! - OPEN_ORDER[b.status]! || byDue(a, b))
  const snoozed = todos.filter((td) => td.status === 'SNOOZED').sort(byDue)
  const completed = todos
    .filter((td) => td.status === 'COMPLETED')
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))

  if (todos.length === 0 && schedules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title={t('tasks.open')} count={open.length}>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('tasks.nothingOpen')}</p>
        ) : (
          open.map((td) => <TodoRow key={td.id} todo={td} />)
        )}
        {snoozed.length > 0 && <SnoozedList todos={snoozed} />}
      </Section>

      {completed.length > 0 && (
        <Section title={t('tasks.completedRecent')} count={completed.length}>
          {completed.map((td) => (
            <TodoRow key={td.id} todo={td} />
          ))}
        </Section>
      )}

      {schedules.length > 0 && (
        <Section title={t('tasks.recurring')} count={schedules.length}>
          {schedules.map((s) => (
            <ScheduleRow key={s.id} schedule={s} />
          ))}
        </Section>
      )}
    </div>
  )
}

/** Open tasks: overdue first, then due today, then upcoming. */
const OPEN_ORDER: Partial<Record<PortalTodoStatus, number>> = { OVERDUE: 0, DUE_TODAY: 1, UPCOMING: 2 }

// Labels: `portal:tasks.status.<status>`, resolved at render time.
const STATUS_CLASS: Record<PortalTodoStatus, string> = {
  OVERDUE: 'border-red-200 bg-red-50 text-red-700',
  DUE_TODAY: 'border-orange-200 bg-orange-50 text-orange-700',
  UPCOMING: 'border-blue-200 bg-blue-50 text-blue-700',
  SNOOZED: 'border-slate-200 bg-slate-50 text-slate-600',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function byDue(a: PortalTodo, b: PortalTodo): number {
  return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
}

/** A date-only value as a local calendar day (never shifted a day by UTC). */
function fmtDay(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString(currentLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtMoment(iso: string): string {
  return new Date(iso).toLocaleString(currentLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          <span className="text-sm font-normal text-muted-foreground">· {count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  )
}

function TodoRow({ todo }: { todo: PortalTodo }) {
  const { t } = useTranslation(['portal', 'common'])
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {todo.status === 'COMPLETED' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 font-medium break-words">{todo.title}</span>
        <Badge variant="outline" className={cn('shrink-0', STATUS_CLASS[todo.status])}>
          {t(`tasks.status.${todo.status}`)}
        </Badge>
      </div>
      <p className="pl-7 text-xs text-muted-foreground">{whenLine(todo)}</p>
      <Notes adminNote={todo.adminNote} teamNote={todo.teamNote} />
    </div>
  )
}

function whenLine(todo: PortalTodo): string {
  if (todo.status === 'COMPLETED') {
    return todo.resolvedAt
      ? i18n.t('portal:tasks.completedAt', { when: fmtMoment(todo.resolvedAt) })
      : i18n.t('portal:tasks.status.COMPLETED')
  }
  const due = todo.dueDate ? i18n.t('portal:tasks.dueOn', { date: fmtDay(todo.dueDate) }) : i18n.t('portal:tasks.noDueDate')
  if (todo.status === 'SNOOZED' && todo.snoozedUntil) return `${due} · ${i18n.t('portal:tasks.snoozedUntil', { date: fmtDay(todo.snoozedUntil) })}`
  if (todo.status === 'OVERDUE' && todo.dueDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.round((today.getTime() - new Date(todo.dueDate + 'T00:00:00').getTime()) / 86_400_000)
    return `${due} · ${i18n.t('portal:tasks.daysOverdue', { count: days })}`
  }
  return due
}

function SnoozedList({ todos }: { todos: PortalTodo[] }) {
  const { t } = useTranslation(['portal', 'common'])
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => setOpen((o) => !o)}>
        <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
        {t('tasks.snoozedCount', { count: todos.length })}
      </Button>
      {open && todos.map((td) => <TodoRow key={td.id} todo={td} />)}
    </div>
  )
}

function ScheduleRow({ schedule }: { schedule: PortalSchedule }) {
  const { t } = useTranslation(['portal', 'common'])
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 font-medium break-words">{schedule.title}</span>
        {schedule.nextDue && (
          <span className="shrink-0 text-xs text-muted-foreground">{t('tasks.next', { date: fmtDay(schedule.nextDue) })}</span>
        )}
      </div>
      <p className="pl-7 text-xs text-muted-foreground">{cycleLabel(schedule)}</p>
      <Notes adminNote={schedule.adminNote} teamNote={schedule.teamNote} />
    </div>
  )
}

function Notes({ adminNote, teamNote }: { adminNote: string | null; teamNote: string | null }) {
  const { t } = useTranslation(['portal', 'common'])
  if (!adminNote && !teamNote) return null
  return (
    <div className="flex flex-col gap-1 pl-7">
      {adminNote && <NoteLine label={t('tasks.noteFromCyg')} text={adminNote} className="bg-amber-50 text-amber-900" />}
      {teamNote && <NoteLine label={t('tasks.noteFromBookkeeper')} text={teamNote} className="bg-teal-50 text-teal-900" />}
    </div>
  )
}

function NoteLine({ label, text, className }: { label: string; text: string; className: string }) {
  const { t } = useTranslation(['portal', 'common'])
  return (
    <div className={cn('flex gap-2 rounded-md px-2 py-1.5 text-xs', className)}>
      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 break-words whitespace-pre-wrap">
        <span className="font-medium">{t('tasks.noteLabel', { label })} </span>
        {text}
      </p>
    </div>
  )
}
