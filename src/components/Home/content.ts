// All copy for the public site, kept here so text edits never touch layout code.
// Rewritten 2026-10-23 (step12c) around what the site actually does today: an AI
// bookkeeping agent backed by the firm's accountants. Assets live in public/site/.
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
  { label: 'How it works', href: '#what-we-do' },
  { label: 'Features', href: '#services' },
]

export const HERO = {
  title: 'Your bookkeeping, done by an AI agent you can just text.',
  body: 'Text, WhatsApp, email or call the CYG Finance assistant. It reads your bank statements, files your receipts, keeps your books up to date and sends you your reports — with real accountants at CYG Finance behind it.',
}

export const WHAT_WE_DO = {
  lead: 'One assistant that knows your books, on every channel you already use — and a team of accountants making sure it gets things right.',
  tabs: [
    {
      id: 'agent',
      title: 'AI agent',
      icon: MessagesSquare,
      photo: '/site/photo-secretarial.jpg',
      body: 'Ask it anything about your books by text, WhatsApp, email, phone or the website chat — "how much did I spend on fuel last month?", "file this receipt", "send me my balance sheet". It remembers the conversation across channels, and can even call or text someone for you when you ask.',
    },
    {
      id: 'bank',
      title: 'Bank feeds & statements',
      icon: Landmark,
      photo: '/site/photo-bookkeeping.jpg',
      body: 'Connect your bank in a few clicks (Canada and the US) and your transactions arrive on their own, or upload your bank-statement PDFs. Every transaction is read and posted as a double-entry row, named and categorised by the rules you set for each payee.',
    },
    {
      id: 'receipts',
      title: 'Receipts & attachments',
      icon: Receipt,
      photo: '/site/photo-compliance.jpg',
      body: 'Snap a receipt and text, WhatsApp or email it to us. The assistant reads it, works out what it is and attaches it to the right transaction — everything is kept in one folder per bank account that you can browse any time.',
    },
    {
      id: 'reports',
      title: 'Reports & schedules',
      icon: CalendarClock,
      photo: '/site/photo-bookkeeping.jpg',
      body: 'Download your ledger, income statement and balance sheet whenever you like, or let the assistant send them on a schedule — a weekly account status, a monthly financial report, or any message you ask for — by text, email or a phone call.',
    },
  ] satisfies { id: string; title: string; icon: LucideIcon; photo: string; body: string }[],
}

export const SERVICES: { label: string; body: string; icon: LucideIcon }[] = [
  {
    label: 'An assistant on every channel',
    body: 'Text, WhatsApp, email, call or chat on the website.',
    icon: MessagesSquare,
  },
  {
    label: 'Bank statements, read for you',
    body: 'Upload PDFs and every transaction is posted.',
    icon: FileText,
  },
  {
    label: 'Automatic bank feeds',
    body: 'Connect Canadian and US banks through Plaid.',
    icon: Landmark,
  },
  {
    label: 'Double-entry ledger',
    body: 'Every row with its debit and credit, ready for your accountant.',
    icon: BookOpenCheck,
  },
  {
    label: 'Receipts matched to transactions',
    body: 'Text or email them — the assistant files them.',
    icon: Receipt,
  },
  {
    label: 'Your own payee rules',
    body: 'Set a name and category once; it applies everywhere.',
    icon: Tags,
  },
  {
    label: 'Financial reports',
    body: 'Ledger, income statement and balance sheet exports.',
    icon: BarChart3,
  },
  {
    label: 'Scheduled updates',
    body: 'Reports and reminders by text, email or phone call.',
    icon: CalendarClock,
  },
  {
    label: 'Calls and texts for you',
    body: 'Ask the assistant to call or text someone with a message.',
    icon: PhoneOutgoing,
  },
  {
    label: 'Several companies',
    body: 'Keep separate books for each of your companies.',
    icon: Building2,
  },
  {
    label: 'Multi-currency',
    body: 'Foreign-currency transactions converted to your home currency.',
    icon: ArrowLeftRight,
  },
  {
    label: 'Real accountants behind it',
    body: 'The CYG Finance team checks the work and is a message away.',
    icon: UserCheck,
  },
]
