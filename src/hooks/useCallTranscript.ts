import { useQuery } from '@tanstack/react-query'
import { COMMUNICATIONS_KEY, fetchCallTranscript } from '@/api/communications'
import { useBook } from './useBook'

/** step12g: a call's transcript, fetched only while its card is open. */
export function useCallTranscript(callId: number, open: boolean) {
  const book = useBook()
  return useQuery({
    queryKey: book.key([...COMMUNICATIONS_KEY, 'call', callId] as const),
    queryFn: () => fetchCallTranscript(book.auth, callId),
    enabled: !!book.token && open,
  })
}
