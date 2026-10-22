/** Shared labels and formatting for the Schedules tab. */

import type { AiFrequency } from '@/api/schedules'

/** A schedule's when, as the editors hold it. */
export type Rule = { frequency: AiFrequency; weekday: number; monthDay: number; time: string }

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The browser's time zone — what "2:00 PM" means to the person choosing it. */
export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
  } catch {
    return 'America/Toronto'
  }
}

export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/** A run's channel in words. */
export const runChannel = (channel: string) =>
  channel === 'NONE'
    ? 'not sent'
    : channel === 'SMS'
      ? 'by text'
      : channel === 'CALL'
        ? 'by phone call'
        : 'by email'

export const isTime = (t: string) => /^\d{2}:\d{2}$/.test(t)

/** The rule as the API takes it (the unused day cleared, the browser's zone). */
export const ruleChange = (r: Rule) => ({
  frequency: r.frequency,
  weekday: r.frequency === 'WEEKLY' ? r.weekday : null,
  monthDay: r.frequency === 'MONTHLY' ? r.monthDay : null,
  time: r.time,
  timezone: browserZone(),
})
