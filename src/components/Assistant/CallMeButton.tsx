import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Phone } from 'lucide-react'
import { CALL_ME_KEY, fetchCallMe, requestCallMe } from '@/api/assistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBook } from '@/hooks/useBook'
import { useUpdateMe } from '@/hooks/useUpdateMe'

/**
 * step2: "Call me" in the chat of one statement or one attachment. The AI phones the
 * customer's own number about it, explains what is wrong, listens and fixes it on the call;
 * what was said is added to the chat afterwards. The answer ("Calling you…" or why not) is
 * written into the chat by the server, so it shows there.
 * step8 (2026-11-11, `pic17.png`): shown whenever the AI phone is on — with no phone on the
 * account, a click asks for one (saved on the profile, `PATCH me`) and then calls. Hidden
 * only when calls are not set up at all.
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
  const [asking, setAsking] = useState(false)
  const [phone, setPhone] = useState('')
  const updateMe = useUpdateMe()
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
  const data = available.data
  // Older servers answer only `available`.
  const voice = data?.voice ?? data?.available ?? false
  if (!voice) return null
  const hasPhone = data?.hasPhone ?? data?.available ?? false

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={call.isPending ? 'Calling you…' : hasPhone ? 'Call me about this' : 'Call me about this — add your phone first'}
      aria-label="Call me about this"
      disabled={disabled || call.isPending}
      onClick={hasPhone ? () => call.mutate() : undefined}
    >
      <Phone />
    </Button>
  )
  if (hasPhone) return button

  return (
    <Popover open={asking} onOpenChange={setAsking}>
      <PopoverTrigger render={button} />
      <PopoverContent align="start" className="w-72">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!phone.trim()) return
            updateMe.mutate(
              { phone: phone.trim() },
              {
                onSuccess: async () => {
                  setAsking(false)
                  await queryClient.invalidateQueries({ queryKey: book.key(CALL_ME_KEY) })
                  call.mutate()
                },
              },
            )
          }}
        >
          <p className="text-sm font-medium text-[#0B1C2C]">What number should we call?</p>
          <p className="text-xs text-muted-foreground">It is saved on your account, so next time we just call.</p>
          <div className="flex gap-1.5">
            <Input
              autoFocus
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder="514 555 1234"
              onChange={(e) => setPhone(e.target.value)}
              className="h-8"
            />
            <Button
              type="submit"
              size="sm"
              disabled={updateMe.isPending || !phone.trim()}
              className="bg-brand text-white hover:bg-brand/85"
            >
              {updateMe.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Call me'}
            </Button>
          </div>
          {updateMe.error && <p className="text-xs text-destructive">{updateMe.error.message}</p>}
        </form>
      </PopoverContent>
    </Popover>
  )
}
