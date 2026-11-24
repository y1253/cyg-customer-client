import { LogOut, Menu } from 'lucide-react'
import { displayName } from '@/api/customerAuth'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DocumentsButton } from '@/components/Assistant/DocumentsButton'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { FloatingChat } from '@/components/Assistant/FloatingChat'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useLiveRefresh } from '@/hooks/useLiveRefresh'
import { cn } from '@/lib/utils'
import { ACCOUNT_ITEM, visibleModules, type NavItem } from './nav'

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-light'
            : 'text-white/70 hover:bg-white/5 hover:text-white',
        )
      }
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="min-w-0 truncate">{t(item.labelKey)}</span>
    </NavLink>
  )
}

/** Logo, modules, and the signed-in customer — shared by the desktop rail and the mobile sheet. */
function SidebarContent({ inSheet = false }: { inSheet?: boolean }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { customer, logout } = useAuth()
  const navigate = useNavigate()
  const assistant = useAssistantEnabled()
  // In the mobile sheet a link also closes the sheet.
  const row = (item: NavItem) =>
    inSheet ? (
      <SheetClose key={item.labelKey} render={<div />} className="block">
        <NavRow item={item} />
      </SheetClose>
    ) : (
      <NavRow key={item.labelKey} item={item} />
    )

  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="px-5 pt-6 pb-8" aria-label={t('common:nav.home')}>
        <img src="/site/logo.png" alt="CYG Finance" className="h-10 w-auto brightness-0 invert" />
      </Link>
      <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[2px] text-white/40">
        {t('nav.services')}
      </p>
      <nav className="flex flex-col gap-1 px-3">
        {visibleModules(assistant).map(row)}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 px-3 py-4">
        <LanguageSwitch tone="dark" className="mb-2 ml-3 self-start" />
        {row(ACCOUNT_ITEM)}
        <button
          type="button"
          onClick={() => {
            navigate('/', { replace: true })
            logout()
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-[18px]" /> {t('common:actions.logOut')}
        </button>
        {customer && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            {customer.avatarUrl ? (
              <img
                src={customer.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                {displayName(customer).charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName(customer)}</p>
              <p className="truncate text-xs text-white/50">{customer.email ?? customer.phone}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The signed-in customer's app shell: a navy rail (the site's hero colour) with the
 * modules, and a light content area. Built to take more modules — add one to `nav.ts`.
 */
export function DashboardLayout() {
  const { t } = useTranslation(['dashboard', 'common'])
  // step12h: changes the AI makes on any channel show without a reload.
  useLiveRefresh()
  // step8 (2026-11-11, `overlooping.png`): the bookkeeping page uses the whole width — the
  // ledger needs it; every other page keeps the reading width.
  const wide = useLocation().pathname.startsWith('/dashboard/bookkeeping')
  return (
    <div className="min-h-svh bg-[#F5F7F7]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[#0B1C2C] lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-[#0B1C2C] px-4 lg:hidden">
        <Link to="/dashboard" aria-label={t('nav.dashboard')}>
          <img src="/site/logo.png" alt="CYG Finance" className="h-9 w-auto brightness-0 invert" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch tone="dark" />
          <Sheet>
            <SheetTrigger
              className="rounded-md p-2 text-white outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/40"
              aria-label={t('common:nav.openMenu')}
            >
              <Menu className="size-6" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none bg-[#0B1C2C] p-0">
              <SheetTitle className="sr-only">{t('common:nav.menu')}</SheetTitle>
              <SidebarContent inSheet />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className={cn('mx-auto px-4 py-8 sm:px-8 lg:py-10', wide ? 'max-w-[110rem]' : 'max-w-6xl')}>
          <Outlet />
        </div>
      </main>

      {/* step8: the AI chat, one click away on every page. step2 (2026-11-11): beside it, the
          paperclip — the book's documents and every way to send them in. */}
      <DocumentsButton />
      <FloatingChat />
    </div>
  )
}
