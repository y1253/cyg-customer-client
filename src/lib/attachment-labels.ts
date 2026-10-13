import type { AttachmentKind } from '@/api/bookkeeping'

/** Date-only ISO → "Sep 2, 2026", parsed as LOCAL midnight so it never slips a day. */
export const fmtDay = (iso: string | null) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

/** "+15145551234" → "(514) 555-1234"; anything else as is. */
export const fmtPhone = (e164: string | null) => {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? '')
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : (e164 ?? '')
}

export const KIND_LABEL: Record<AttachmentKind, string> = {
  RECEIPT: 'Receipt',
  CHECK: 'Cheque',
  AUDIO: 'Voice note',
  TEXT: 'Text message',
  OTHER: 'File',
}
