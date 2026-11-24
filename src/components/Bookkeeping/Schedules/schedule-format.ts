/** Shared labels and formatting for the Schedules tab. */

import i18n, { currentLocale } from '@/i18n'
import type { AiFrequency } from '@/api/schedules'

/** A schedule's when, as the editors hold it. */
export type Rule = {
  frequency: AiFrequency
  weekday: number
  monthDay: number
  time: string
  /** ONCE: "YYYY-MM-DD". */
  date: string
}

/** Sunday … Saturday in the shown language (index 0 = Sunday, as the API counts). */
export const weekdays = (): string[] => {
  const fmt = new Intl.DateTimeFormat(currentLocale(), { weekday: 'long' })
  // 2024-01-07 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const name = fmt.format(new Date(2024, 0, 7 + i))
    return name.charAt(0).toUpperCase() + name.slice(1)
  })
}

/** The browser's time zone — what "2:00 PM" means to the person choosing it. */
export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
  } catch {
    return 'America/Toronto'
  }
}

export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(currentLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/** A run's channel in words. */
export const runChannel = (channel: string) =>
  channel === 'NONE'
    ? i18n.t('books:schedules.run.none')
    : channel === 'SMS'
      ? i18n.t('books:schedules.run.sms')
      : channel === 'CALL'
        ? i18n.t('books:schedules.run.call')
        : i18n.t('books:schedules.run.email')

export const isTime = (t: string) => /^\d{2}:\d{2}$/.test(t)

/** A rule the API will take: a real time, and a day for a ONCE rule. */
export const isRule = (r: Rule) => isTime(r.time) && (r.frequency !== 'ONCE' || /^\d{4}-\d{2}-\d{2}$/.test(r.date))

/** Today in the browser, "YYYY-MM-DD" (the earliest a ONCE schedule can be). */
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The rule as the API takes it (the unused day cleared, the browser's zone). */
export const ruleChange = (r: Rule) => ({
  frequency: r.frequency,
  weekday: r.frequency === 'WEEKLY' ? r.weekday : null,
  monthDay: r.frequency === 'MONTHLY' ? r.monthDay : null,
  time: r.time,
  timezone: browserZone(),
  ...(r.frequency === 'ONCE' ? { date: r.date } : {}),
})
