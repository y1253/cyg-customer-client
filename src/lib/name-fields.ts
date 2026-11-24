import { AtSign, Globe, MapPin, Phone, StickyNote, Tag } from 'lucide-react'
import type { NameField, NameFieldKind } from '@/api/bookkeeping'
import i18n from '@/i18n'

/** step2 (2026-11-09): a name's profile fields — labels, icons, placeholders and links. */
/** A field kind's label, in the site's language (resolved when called). */
export const fieldKindLabel = (kind: NameFieldKind) => i18n.t(`names:fieldKind.${kind}`)

/** Every field kind, in the order the editor offers them. */
export const FIELD_KINDS: NameFieldKind[] = ['PHONE', 'EMAIL', 'ADDRESS', 'WEBSITE', 'NOTE', 'TEXT']

export const FIELD_KIND_ICON: Record<NameFieldKind, typeof Phone> = {
  PHONE: Phone,
  EMAIL: AtSign,
  ADDRESS: MapPin,
  WEBSITE: Globe,
  NOTE: StickyNote,
  TEXT: Tag,
}

/** A field kind's example value, in the site's language (resolved when called). */
export const fieldPlaceholder = (kind: NameFieldKind) => i18n.t(`names:fieldPlaceholder.${kind}`)

/** Where a field's value leads, when it leads anywhere (call, email, open the site). */
export function fieldHref(f: NameField): string | null {
  if (f.kind === 'PHONE') return `tel:${f.value}`
  if (f.kind === 'EMAIL') return `mailto:${f.value}`
  if (f.kind === 'WEBSITE') return /^https?:\/\//i.test(f.value) ? f.value : `https://${f.value}`
  return null
}
