// The public site's structure: ids, icons and photos. The words live in the `site`
// translation files (src/i18n/locales/{fr,en}/site.json), keyed by these ids, so text
// edits never touch layout code. Rewritten 2026-10-23 (step12c) around what the site
// actually does today: an AI bookkeeping agent backed by the firm's accountants.
// ⚠️ The server's sales prompt (customer/server/src/sales/sales-prompt.ts) repeats the
// English copy — keep it in step with en/site.json. Assets live in public/site/.
import {
  ArrowLeftRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarClock,
  FileText,
  Landmark,
  MessagesSquare,
  PhoneOutgoing,
  Receipt,
  Tags,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

export const CONTACT = {
  email: 'office@cygfinance.com',
  phoneLabel: '855-CYG-FINA (855-294-3462)',
  phoneHref: 'tel:18552943462',
}

export const NAV_LINKS = [
  { key: 'howItWorks', href: '#what-we-do' },
  { key: 'features', href: '#services' },
] as const

export const WHAT_WE_DO_TABS = [
  { id: 'agent', icon: MessagesSquare, photo: '/site/photo-secretarial.jpg' },
  { id: 'bank', icon: Landmark, photo: '/site/photo-bookkeeping.jpg' },
  { id: 'receipts', icon: Receipt, photo: '/site/photo-compliance.jpg' },
  { id: 'reports', icon: CalendarClock, photo: '/site/photo-bookkeeping.jpg' },
] as const satisfies readonly { id: string; icon: LucideIcon; photo: string }[]

export const SERVICES = [
  { id: 'channels', icon: MessagesSquare },
  { id: 'statements', icon: FileText },
  { id: 'feeds', icon: Landmark },
  { id: 'ledger', icon: BookOpenCheck },
  { id: 'receipts', icon: Receipt },
  { id: 'rules', icon: Tags },
  { id: 'reports', icon: BarChart3 },
  { id: 'schedules', icon: CalendarClock },
  { id: 'calls', icon: PhoneOutgoing },
  { id: 'companies', icon: Building2 },
  { id: 'currency', icon: ArrowLeftRight },
  { id: 'accountants', icon: UserCheck },
] as const satisfies readonly { id: string; icon: LucideIcon }[]
