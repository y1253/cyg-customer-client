import { AtSign, Globe, MapPin, Phone, StickyNote, Tag } from 'lucide-react'
import type { NameField, NameFieldKind } from '@/api/bookkeeping'

/** step2 (2026-11-09): a name's profile fields — labels, icons, placeholders and links. */
export const FIELD_KIND_LABEL: Record<NameFieldKind, string> = {
  PHONE: 'Phone',
  EMAIL: 'Email',
  ADDRESS: 'Address',
  WEBSITE: 'Website',
  NOTE: 'Note',
  TEXT: 'Other',
}

export const FIELD_KIND_ICON: Record<NameFieldKind, typeof Phone> = {
  PHONE: Phone,
  EMAIL: AtSign,
  ADDRESS: MapPin,
  WEBSITE: Globe,
  NOTE: StickyNote,
  TEXT: Tag,
}

export const FIELD_PLACEHOLDER: Record<NameFieldKind, string> = {
  PHONE: '514 555 1234',
  EMAIL: 'name@example.com',
  ADDRESS: '123 Main St, Montreal QC',
  WEBSITE: 'example.com',
  NOTE: 'Anything to remember',
  TEXT: 'Value',
}

/** Where a field's value leads, when it leads anywhere (call, email, open the site). */
export function fieldHref(f: NameField): string | null {
  if (f.kind === 'PHONE') return `tel:${f.value}`
  if (f.kind === 'EMAIL') return `mailto:${f.value}`
  if (f.kind === 'WEBSITE') return /^https?:\/\//i.test(f.value) ? f.value : `https://${f.value}`
  return null
}
