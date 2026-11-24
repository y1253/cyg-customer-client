import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('ledger')
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
          <p className="font-semibold text-[#0B1C2C]">{wa ? t('receipts.titleWa') : t('receipts.title')}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {wa ? t('receipts.sendWa') : t('receipts.send')}
          </p>
          <div className="mt-3">
            <IntakeNumberChips intake={data} />
          </div>
          {data.voice && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Trans t={t} i18nKey="receipts.call" components={{ b: <span className="font-medium text-[#0B1C2C]" /> }} />
            </p>
          )}
          {data.email && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="receipts.email"
                values={{ email: data.email }}
                components={{
                  link: (
                    <a href={`mailto:${data.email}`} className="font-medium text-brand underline-offset-2 hover:underline" />
                  ),
                  b: <span className="font-medium text-[#0B1C2C]" />,
                }}
              />
            </p>
          )}
          {data.phone ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans
                t={t}
                i18nKey={wa ? 'receipts.recogniseWa' : 'receipts.recognise'}
                values={{ phone: fmtPhone(data.phone) }}
                components={{ b: <span className="font-medium text-[#0B1C2C]" /> }}
              />
            </p>
          ) : (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                <Trans
                  t={t}
                  i18nKey={
                    data.phoneSaved
                      ? wa
                        ? 'receipts.badPhoneWa'
                        : 'receipts.badPhone'
                      : wa
                        ? 'receipts.noPhoneWa'
                        : 'receipts.noPhone'
                  }
                  components={{
                    link: <Link to="/dashboard/account" className="font-medium underline underline-offset-2" />,
                  }}
                />
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
