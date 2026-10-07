import { ChevronDown, LayoutDashboard, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SheetClose } from '@/components/ui/sheet'
import type { Customer } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

/** Round avatar: the Google photo when there is one, else the first initial. */
function Avatar({ customer, className }: { customer: Customer; className?: string }) {
  return customer.avatarUrl ? (
    <img
      src={customer.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className={cn('rounded-full object-cover', className)}
    />
  ) : (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-brand font-semibold text-white',
        className,
      )}
    >
      {customer.name.charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * The account corner of the transparent desktop header. Deliberately QUIETER than the
 * "Contact Us" CTA beside it: a thin divider, a plain "Log in" link and a small outlined
 * "Sign up" — so the page keeps one primary button. Signed in, it collapses to an avatar
 * chip with a menu.
 */
export function HeaderAccountDesktop() {
  const { token, customer, logout } = useAuth()

  return (
    <div className="flex items-center gap-5 border-l border-white/20 pl-6">
      {token && customer ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/40">
            <Avatar customer={customer} className="size-9 text-sm" />
            <span className="max-w-32 truncate text-base font-medium">
              {customer.name.split(' ')[0]}
            </span>
            <ChevronDown className="size-4 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56 p-2">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{customer.name}</p>
              <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 px-3 py-2.5" render={<Link to="/dashboard" />}>
              <LayoutDashboard /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2.5" render={<Link to="/dashboard/account" />}>
              <UserRound /> My account
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2.5" onClick={logout}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Link
            to="/login"
            className="text-base font-medium whitespace-nowrap text-white transition-opacity hover:opacity-70"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-10 rounded-lg border-white/50 bg-transparent px-5 text-base font-semibold text-white',
              'hover:border-white hover:bg-white hover:text-[#0B1C2C]',
            )}
          >
            Sign up
          </Link>
        </>
      )}
    </div>
  )
}

/** The same corner inside the mobile menu sheet, under the Contact Us CTA. */
export function HeaderAccountMobile() {
  const { token, customer, logout } = useAuth()

  if (token && customer) {
    return (
      <div className="mt-6 flex items-center gap-3 border-t pt-6">
        <Avatar customer={customer} className="size-11 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{customer.name}</p>
          <SheetClose
            render={<Link to="/dashboard" />}
            className="text-sm font-medium text-brand hover:underline"
          >
            Go to dashboard
          </SheetClose>
        </div>
        <SheetClose
          onClick={logout}
          className={cn(buttonVariants({ variant: 'outline' }), 'h-10 gap-2 rounded-lg px-4')}
        >
          <LogOut className="size-4" /> Log out
        </SheetClose>
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-6">
      <SheetClose
        render={<Link to="/login" />}
        className={cn(buttonVariants({ variant: 'outline' }), 'h-12 rounded-lg text-base font-semibold')}
      >
        Log in
      </SheetClose>
      <SheetClose
        render={<Link to="/signup" />}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-12 rounded-lg border-brand text-base font-semibold text-brand hover:bg-brand hover:text-white',
        )}
      >
        Sign up
      </SheetClose>
    </div>
  )
}
