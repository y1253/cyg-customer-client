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

// ---- step12: the schedules the customer asked the AI assistant for ---------------------

/** ONCE (step12b) = one time, on `runDate` ("call me tomorrow at 3pm"). */
export type AiFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE'
/** How it is sent; null = the customer's preferred contact. CALL = the AI phones them. */
export type AiScheduleChannel = 'EMAIL' | 'SMS' | 'CALL'

export type AiSchedule = {
  id: number
  title: string
  /** What the assistant looks up and sends each time. */
  task: string
  frequency: AiFrequency
  weekday: number | null
  monthDay: number | null
  time: string
  timezone: string
  /** ONCE: "YYYY-MM-DD". */
  runDate: string | null
  /** "Every day at 6:00 AM". */
  description: string
  channel: AiScheduleChannel | null
  active: boolean
  createdBy: 'AI' | 'CUSTOMER'
  nextRunAt: string | null
  lastRunAt: string | null
  createdAt: string
  /** How it would go out right now. */
  delivery: { channel: AiScheduleChannel | null; to: string | null }
  runs: ScheduleRun[]
}

export type AiScheduleChange = Partial<
  Pick<AiSchedule, 'title' | 'task' | 'active' | 'frequency' | 'weekday' | 'monthDay' | 'time' | 'timezone' | 'channel'>
> & { date?: string | null }

export const AI_SCHEDULES_KEY = ['ai-schedules'] as const

export async function fetchAiSchedules(auth: BookAuth): Promise<AiSchedule[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/schedules/custom')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function updateAiSchedule(auth: BookAuth, id: number, change: AiScheduleChange): Promise<AiSchedule> {
  const res = await bookFetch(auth, `/api/bookkeeping/schedules/custom/${id}`, json('PUT', change))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteAiSchedule(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/schedules/custom/${id}`, json('DELETE'))
  if (!res.ok) throw await errorFrom(res)
}

export async function sendAiScheduleNow(auth: BookAuth, id: number): Promise<AiSchedule> {
  const res = await bookFetch(auth, `/api/bookkeeping/schedules/custom/${id}/send-now`, json('POST'))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}
