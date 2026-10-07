import { BookOpenCheck, FileText, LayoutDashboard, Receipt, UserRound, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  /** Shown greyed out with a "Soon" badge — the dashboard is built to grow. */
  soon?: boolean
  /** Match only this exact path (the Overview link would otherwise match everything). */
  end?: boolean
}

/** The modules a customer can open. Add a module here and give it a route. */
export const MODULES: NavItem[] = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Bookkeeping', to: '/dashboard/bookkeeping', icon: BookOpenCheck },
  { label: 'Invoices', to: '#', icon: Receipt, soon: true },
  { label: 'Tax filing', to: '#', icon: FileText, soon: true },
  { label: 'Payroll', to: '#', icon: Wallet, soon: true },
]

export const ACCOUNT_ITEM: NavItem = {
  label: 'My account',
  to: '/dashboard/account',
  icon: UserRound,
}
