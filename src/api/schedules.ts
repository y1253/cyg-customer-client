import { bookFetch, type BookAuth } from './bookkeeping'
import { errorFrom } from './client'

/** step11b: the two scheduled messages a book sends its customer. */
export type ScheduleType = 'ACCOUNT_STATUS' | 'FINANCIAL_REPORT'
export type Frequency = 'WEEKLY' | 'MONTHLY'

export type ScheduleRun = {
  at: string
  /** EMAIL | SMS | NONE (nothing to send / nowhere to send). */
  channel: string
  ok: boolean
  error: string | null
  /** Sent with "Send now". */
  manual: boolean
  text: string | null
}

export type Schedule = {
  type: ScheduleType
  enabled: boolean
  frequency: Frequency
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number | null
  /** 1–28, or 0 = the last day of the month. */
  monthDay: number | null
  /** "HH:mm". */
  time: string
  timezone: string
  /** "Every Monday at 2:00 PM". */
  description: string
  nextRunAt: string | null
  lastRunAt: string | null
  delivery: { channel: 'EMAIL' | 'SMS' | 'CALL' | null; to: string | null; preferred: string | null }
  runs: ScheduleRun[]
}

export type ScheduleChange = Partial<
  Pick<Schedule, 'enabled' | 'frequency' | 'weekday' | 'monthDay' | 'time' | 'timezone'>
>

export const SCHEDULES_KEY = ['schedules'] as const

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export async function fetchSchedules(auth: BookAuth): Promise<Schedule[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/schedules')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function updateSchedule(auth: BookAuth, type: ScheduleType, change: ScheduleChange): Promise<Schedule> {
  const res = await bookFetch(auth, `/api/bookkeeping/schedules/${type}`, json('PUT', change))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function sendScheduleNow(auth: BookAuth, type: ScheduleType): Promise<Schedule> {
  const res = await bookFetch(auth, `/api/bookkeeping/schedules/${type}/send-now`, json('POST'))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}
