import { MessageCircle, MessageSquareText } from 'lucide-react'
import type { Intake } from '@/api/attachments'
import { fmtPhone } from '@/lib/attachment-labels'

/**
 * The firm's receipt numbers as tap targets: a "Text" chip on every number, and a green
 * "WhatsApp" chip beside the ones an admin also turned WhatsApp on for. Every place that
 * shows a receipt number renders it through here, so none can show the number without
 * saying it takes WhatsApp too.
 */
export function IntakeNumberChips({ intake }: { intake: Pick<Intake, 'numbers' | 'whatsapp'> }) {
  const wa = new Set(intake.whatsapp ?? [])
  return (
    <div className="flex flex-col gap-2">
      {intake.numbers.map((n) => (
        <div key={n} className="flex flex-wrap items-center gap-2">
          <a
            href={`sms:${n}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand tabular-nums hover:bg-brand/15"
          >
            <MessageSquareText className="size-4" />
            {fmtPhone(n)}
          </a>
          {wa.has(n) && (
            <a
              href={`https://wa.me/${n.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
