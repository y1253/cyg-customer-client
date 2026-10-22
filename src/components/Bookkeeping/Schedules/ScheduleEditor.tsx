import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { AiFrequency, AiSchedule, AiScheduleChannel, Schedule } from '@/api/schedules'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MonthDaySelect } from '@/components/ui/MonthDaySelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAiScheduleActions, useScheduleActions } from '@/hooks/useSchedules'
import { RunHistory } from './RunHistory'
import { WEEKDAYS, isTime, ruleChange, type Rule } from './schedule-format'

const FREQ_LABEL: Record<AiFrequency, string> = {
  DAILY: 'Every day',
  WEEKLY: 'Every week',
  MONTHLY: 'Every month',
}

/** Repeat · day · time — the three fields every schedule has. */
function RuleFields({
  id,
  rule,
  onChange,
  frequencies,
}: {
  id: string
  rule: Rule
  onChange: (r: Rule) => void
  frequencies: AiFrequency[]
}) {
  const set = (patch: Partial<Rule>) => onChange({ ...rule, ...patch })
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-repeat`}>Repeat</Label>
        <Select value={rule.frequency} onValueChange={(v) => v && set({ frequency: v as AiFrequency })}>
          <SelectTrigger id={`${id}-repeat`} className="h-9 w-full">
            <SelectValue>{(v: AiFrequency) => FREQ_LABEL[v]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {frequencies.map((f) => (
              <SelectItem key={f} value={f}>
                {FREQ_LABEL[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {rule.frequency !== 'DAILY' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-day`}>{rule.frequency === 'WEEKLY' ? 'Day' : 'Day of month'}</Label>
          {rule.frequency === 'WEEKLY' ? (
            <Select value={String(rule.weekday)} onValueChange={(v) => v !== null && set({ weekday: Number(v) })}>
              <SelectTrigger id={`${id}-day`} className="h-9 w-full">
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
            <MonthDaySelect id={`${id}-day`} value={rule.monthDay} onChange={(monthDay) => set({ monthDay })} />
          )}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-time`}>Time</Label>
        <Input
          id={`${id}-time`}
          type="time"
          value={rule.time}
          onChange={(e) => set({ time: e.target.value })}
          className="h-9"
        />
      </div>
    </div>
  )
}

const ruleOf = (s: { frequency: AiFrequency; weekday: number | null; monthDay: number | null; time: string }): Rule => ({
  frequency: s.frequency,
  weekday: s.weekday ?? 1,
  monthDay: s.monthDay ?? 1,
  time: s.time,
})

const ruleChanged = (a: Rule, b: Rule) =>
  a.frequency !== b.frequency ||
  a.time !== b.time ||
  (a.frequency === 'WEEKLY' && a.weekday !== b.weekday) ||
  (a.frequency === 'MONTHLY' && a.monthDay !== b.monthDay)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-[#0B1C2C]">{title}</p>
      {children}
    </div>
  )
}

/** A built-in schedule's settings: when it goes out, plus what it is and its last sends. */
export function BuiltInEditor({ s, about, note }: { s: Schedule; about: string; note: React.ReactNode }) {
  const { update } = useScheduleActions()
  const [rule, setRule] = useState<Rule>(ruleOf(s))
  const changed = ruleChanged(rule, ruleOf(s))
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{about}</p>
      <RuleFields id={s.type} rule={rule} onChange={setRule} frequencies={['WEEKLY', 'MONTHLY']} />
      {changed && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={update.isPending || !isTime(rule.time)}
            onClick={() =>
              update.mutate({
                type: s.type,
                change: { ...ruleChange(rule), frequency: rule.frequency === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY' },
              })
            }
          >
            {update.isPending && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRule(ruleOf(s))}>
            Cancel
          </Button>
        </div>
      )}
      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{note}</p>
      <Section title="Recent sends">
        <RunHistory runs={s.runs} />
      </Section>
    </div>
  )
}

const CHANNEL_LABEL: Record<'PREFERRED' | AiScheduleChannel, string> = {
  PREFERRED: 'My preferred contact',
  SMS: 'Text message',
  EMAIL: 'Email',
}

/** A schedule the AI made: its name, what it sends, when and how — all editable. */
export function AiEditor({ s, note }: { s: AiSchedule; note: React.ReactNode }) {
  const { update } = useAiScheduleActions()
  const [title, setTitle] = useState(s.title)
  const [task, setTask] = useState(s.task)
  const [rule, setRule] = useState<Rule>(ruleOf(s))
  const [channel, setChannel] = useState<'PREFERRED' | AiScheduleChannel>(s.channel ?? 'PREFERRED')
  const changed =
    title.trim() !== s.title ||
    task.trim() !== s.task ||
    channel !== (s.channel ?? 'PREFERRED') ||
    ruleChanged(rule, ruleOf(s))
  const reset = () => {
    setTitle(s.title)
    setTask(s.task)
    setRule(ruleOf(s))
    setChannel(s.channel ?? 'PREFERRED')
  }
  const valid = title.trim() && task.trim() && isTime(rule.time)
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ai-${s.id}-title`}>Name</Label>
          <Input
            id={`ai-${s.id}-title`}
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ai-${s.id}-channel`}>Send by</Label>
          <Select value={channel} onValueChange={(v) => v && setChannel(v as typeof channel)}>
            <SelectTrigger id={`ai-${s.id}-channel`} className="h-9 w-full">
              <SelectValue>{(v: typeof channel) => CHANNEL_LABEL[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(['PREFERRED', 'SMS', 'EMAIL'] as const).map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`ai-${s.id}-task`}>What the assistant sends each time</Label>
        <Textarea
          id={`ai-${s.id}-task`}
          value={task}
          maxLength={4000}
          rows={3}
          onChange={(e) => setTask(e.target.value)}
        />
      </div>
      <RuleFields id={`ai-${s.id}`} rule={rule} onChange={setRule} frequencies={['DAILY', 'WEEKLY', 'MONTHLY']} />
      {changed && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={update.isPending || !valid}
            onClick={() =>
              update.mutate({
                id: s.id,
                change: {
                  title: title.trim(),
                  task: task.trim(),
                  channel: channel === 'PREFERRED' ? null : channel,
                  ...ruleChange(rule),
                },
              })
            }
          >
            {update.isPending && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            Cancel
          </Button>
        </div>
      )}
      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{note}</p>
      <Section title="Recent sends">
        <RunHistory runs={s.runs} />
      </Section>
    </div>
  )
}
