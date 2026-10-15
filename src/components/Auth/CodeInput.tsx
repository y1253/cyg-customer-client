import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** The 6-digit emailed code: digits only, big and spaced out. */
export function CodeInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (code: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        placeholder="123456"
        className="h-12 text-center text-2xl tracking-[0.5em]"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
    </div>
  )
}

/** "Resend code in 42s" → "Resend code". `wait` comes from `useCountdown`. */
export function ResendButton({
  wait,
  pending,
  onClick,
}: {
  wait: number
  pending: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0"
      disabled={wait > 0 || pending}
      onClick={onClick}
    >
      {pending ? 'Sending…' : wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
    </Button>
  )
}
