import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Phone } from 'lucide-react'
import { CALL_ME_KEY, fetchCallMe, requestCallMe } from '@/api/assistant'
import { Button } from '@/components/ui/button'
import { useBook } from '@/hooks/useBook'

/**
 * step2: "Call me" in the chat of one statement or one attachment. The AI phones the
 * customer's own number about it, explains what is wrong, listens and fixes it on the call;
 * what was said is added to the chat afterwards. Hidden when no call can be placed (no
 * phone on the account, calls not set up). The answer ("Calling you…" or why not) is
 * written into the chat by the server, so it shows there.
 */
export function CallMeButton({
  target,
  disabled,
}: {
  target: { statementId: number } | { attachmentId: number }
  disabled?: boolean
}) {
  const book = useBook()
  const queryClient = useQueryClient()
  const available = useQuery({
    queryKey: book.key(CALL_ME_KEY),
    queryFn: () => fetchCallMe(book.auth),
    enabled: !!book.token,
    staleTime: 5 * 60_000,
  })
  const call = useMutation({
    mutationFn: () => requestCallMe(book.auth, target),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: 'statementId' in target ? ['statement-chat'] : ['attachment-chat'],
      }),
  })
  if (!available.data?.available) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={call.isPending ? 'Calling you…' : 'Call me about this'}
      aria-label="Call me about this"
      disabled={disabled || call.isPending}
      onClick={() => call.mutate()}
    >
      <Phone />
    </Button>
  )
}
