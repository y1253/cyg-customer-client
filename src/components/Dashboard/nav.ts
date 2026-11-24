import { BookOpenCheck, BookUser, Building2, Lightbulb, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavLabelKey = 'nav.businesses' | 'nav.bookkeeping' | 'nav.contacts' | 'nav.requests' | 'nav.account'

export type NavItem = {
  /** Key in the `dashboard` namespace, resolved at render (`t(item.labelKey)`). */
  labelKey: NavLabelKey
  to: string
  icon: LucideIcon
  /** Kept (with its routes) but shown nowhere — the sidebar and Overview skip it. */
  hidden?: boolean
  /** Match only this exact path (the Overview link would otherwise match everything). */
  end?: boolean
  /** Only while the firm has the AI assistant on (`GET /api/assistant/config`). */
  assistant?: boolean
}

/** The modules a customer can open. Add a module here and give it a route. */
// step2 (2026-11-09, user's request): no Overview and no AI assistant page — /dashboard
// opens Bookkeeping, and the AI is the chat bubble on every page.
export const MODULES: NavItem[] = [
  // Parked 2026-10-23 (step12c): registering businesses comes back later — its routes and
  // components are untouched, only the entry is hidden.
  { labelKey: 'nav.businesses', to: '/dashboard/register', icon: Building2, hidden: true },
  { labelKey: 'nav.bookkeeping', to: '/dashboard/bookkeeping', icon: BookOpenCheck },
  { labelKey: 'nav.contacts', to: '/dashboard/contacts', icon: BookUser },
  // step12e: what they asked the AI for that we don't do yet.
  { labelKey: 'nav.requests', to: '/dashboard/requests', icon: Lightbulb, assistant: true },
]

/** The modules shown to this customer (hidden ones out; the assistant only while it is on). */
export function visibleModules(assistantOn: boolean): NavItem[] {
  return MODULES.filter((m) => !m.hidden && (!m.assistant || assistantOn))
}

export const ACCOUNT_ITEM: NavItem = {
  labelKey: 'nav.account',
  to: '/dashboard/account',
  icon: UserRound,
}
