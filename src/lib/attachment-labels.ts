import type { AttachmentKind } from '@/api/bookkeeping'
import i18n, { currentLocale } from '@/i18n'

/** Date-only ISO → "Sep 2, 2026", parsed as LOCAL midnight so it never slips a day. */
export const fmtDay = (iso: string | null) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

/** "+15145551234" → "(514) 555-1234"; anything else as is. */
export const fmtPhone = (e164: string | null) => {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? '')
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : (e164 ?? '')
}

/** "Receipt" / "Reçu" — the label of an attachment kind in the shown language. */
export const kindLabel = (kind: AttachmentKind) => i18n.t(`common:kind.${kind}`)
