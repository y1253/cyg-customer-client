import type { Intake } from '@/api/attachments'
import i18n from '@/i18n'

/** True when at least one receipt number also takes WhatsApp. */
export const takesWhatsApp = (intake: Pick<Intake, 'whatsapp'> | undefined): boolean =>
  !!intake?.whatsapp?.length

/**
 * "text" or "text or WhatsApp" — the one wording every receipt-number blurb uses
 * (French: "par texto" / "par texto ou WhatsApp", it follows "envoyez").
 */
export const sendVerb = (intake: Pick<Intake, 'whatsapp'> | undefined): string =>
  takesWhatsApp(intake) ? i18n.t('assistant:intake.sendVerbWhatsapp') : i18n.t('assistant:intake.sendVerb')
