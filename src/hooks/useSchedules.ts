import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AI_SCHEDULES_KEY,
  SCHEDULES_KEY,
  deleteAiSchedule,
  fetchAiSchedules,
  fetchSchedules,
  sendAiScheduleNow,
  updateAiSchedule,
  type AiSchedule,
  type AiScheduleChange,
  sendScheduleNow,
  updateSchedule,
  type Schedule,
  type ScheduleChange,
  type ScheduleType,
} from '@/api/schedules'
import { useBook } from './useBook'

/** step11b: this book's scheduled messages (the Schedules tab). */
export function useSchedules() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(SCHEDULES_KEY),
    queryFn: () => fetchSchedules(book.auth),
    enabled: !!book.token,
  })
}

/** Saves a change (or sends now) and puts the server's answer straight into the list. */
export function useScheduleActions() {
  const book = useBook()
  const queryClient = useQueryClient()
  const put = (s: Schedule) =>
    queryClient.setQueryData<Schedule[]>(book.key(SCHEDULES_KEY), (old) =>
      (old ?? []).map((x) => (x.type === s.type ? s : x)),
    )
  const update = useMutation({
    mutationFn: ({ type, change }: { type: ScheduleType; change: ScheduleChange }) =>
      updateSchedule(book.auth, type, change),
    onSuccess: put,
  })
  const sendNow = useMutation({
    mutationFn: (type: ScheduleType) => sendScheduleNow(book.auth, type),
    onSuccess: put,
  })
  return { update, sendNow }
}

/** step12: the schedules the customer asked the AI assistant for (this book's). */
export function useAiSchedules() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(AI_SCHEDULES_KEY),
    queryFn: () => fetchAiSchedules(book.auth),
    enabled: !!book.token,
  })
}

export function useAiScheduleActions() {
  const book = useBook()
  const queryClient = useQueryClient()
  const key = book.key(AI_SCHEDULES_KEY)
  const put = (s: AiSchedule) =>
    queryClient.setQueryData<AiSchedule[]>(key, (old) => (old ?? []).map((x) => (x.id === s.id ? s : x)))
  const update = useMutation({
    mutationFn: ({ id, change }: { id: number; change: AiScheduleChange }) => updateAiSchedule(book.auth, id, change),
    onSuccess: put,
  })
  const sendNow = useMutation({
    mutationFn: (id: number) => sendAiScheduleNow(book.auth, id),
    onSuccess: put,
  })
  const remove = useMutation({
    mutationFn: (id: number) => deleteAiSchedule(book.auth, id),
    onSuccess: (_, id) => queryClient.setQueryData<AiSchedule[]>(key, (old) => (old ?? []).filter((x) => x.id !== id)),
  })
  return { update, sendNow, remove }
}
