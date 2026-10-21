import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  SCHEDULES_KEY,
  fetchSchedules,
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
