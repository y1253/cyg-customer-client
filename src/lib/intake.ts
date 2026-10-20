import type { Intake } from '@/api/attachments'

/** True when at least one receipt number also takes WhatsApp. */
export const takesWhatsApp = (intake: Pick<Intake, 'whatsapp'> | undefined): boolean =>
  !!intake?.whatsapp?.length

/** "text" or "text or WhatsApp" — the one wording every receipt-number blurb uses. */
export const sendVerb = (intake: Pick<Intake, 'whatsapp'> | undefined): string =>
  takesWhatsApp(intake) ? 'text or WhatsApp' : 'text'
