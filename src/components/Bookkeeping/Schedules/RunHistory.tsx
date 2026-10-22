import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ScheduleRun } from '@/api/schedules'
import { fmtWhen, runChannel } from './schedule-format'

/** The last few sends of a schedule, newest first. */
export function RunHistory({ runs }: { runs: ScheduleRun[] }) {
  if (!runs.length) {
    return <p className="text-xs text-muted-foreground">Nothing sent yet.</p>
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {runs.map((r, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
          {r.ok ? (
            <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-px size-3.5 shrink-0 text-red-600" />
          )}
          <span className="min-w-0">
            <span className="font-medium text-foreground/80">{fmtWhen(r.at)}</span> · {runChannel(r.channel)}
            {r.manual && ' (send now)'}
            {r.channel === 'NONE' && r.text ? ` — ${r.text}` : ''}
            {r.error ? ` — ${r.error}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
