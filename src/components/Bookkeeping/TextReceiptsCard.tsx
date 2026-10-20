import { Link } from 'react-router-dom'
import { AlertTriangle, MessageSquareText } from 'lucide-react'
import { useIntake } from '@/hooks/useIntake'
import { fmtPhone } from '@/lib/attachment-labels'
import { cn } from '@/lib/utils'
import { takesWhatsApp } from '@/lib/intake'
import { IntakeNumberChips } from './IntakeNumberChips'

/**
 * "Text us your receipts to …": the firm's intake numbers, and the phone texts are matched
 * on. When an admin turned WhatsApp on for a number it reads "Text or WhatsApp" and offers
 * both — texting keeps working either way. Without a usable phone on the account nothing
 * can be filed, so it says so and links to My account. Renders nothing while the firm has
 * connected no number.
 */
export function TextReceiptsCard({ className }: { className?: string }) {
  const intake = useIntake()
  const data = intake.data
  if (!data?.numbers.length) return null
  const wa = takesWhatsApp(data)

  return (
    <div className={cn('rounded-2xl bg-white p-5 ring-1 ring-black/5', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <MessageSquareText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0B1C2C]">{wa ? 'Text or WhatsApp us your receipts' : 'Text us your receipts'}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Send a photo, a PDF, a voice note or just a few words (“bought tissues at Walmart, $23”)
            {wa ? ' by text or WhatsApp' : ''} — we file it like an upload.
          </p>
          <div className="mt-3">
            <IntakeNumberChips intake={data} />
          </div>
          {data.email && (
            <p className="mt-3 text-sm text-muted-foreground">
              Or email them to{' '}
              <a href={`mailto:${data.email}`} className="font-medium text-brand underline-offset-2 hover:underline">
                {data.email}
              </a>{' '}
              from <span className="font-medium text-[#0B1C2C]">the email on your account</span> — you can ask questions there too.
            </p>
          )}
          {data.phone ? (
            <p className="mt-3 text-xs text-muted-foreground">
              We recognise {wa ? 'texts and WhatsApp messages' : 'texts'} from{' '}
              <span className="font-medium text-[#0B1C2C]">{fmtPhone(data.phone)}</span>, the phone on your account.
            </p>
          ) : (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                {data.phoneSaved ? 'The phone on your account isn’t a valid number' : 'Add your mobile number'} so we know
                your {wa ? 'messages' : 'texts'} are from you —{' '}
                <Link to="/dashboard/account" className="font-medium underline underline-offset-2">
                  My account
                </Link>
                .
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
