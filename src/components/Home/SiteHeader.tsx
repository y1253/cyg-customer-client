import { ChevronDown, Info, Mail, Menu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { NAV_LINKS } from './content'
import { ctaClass } from './cta'

const NAV_LINK =
  'whitespace-nowrap py-3 text-lg font-medium tracking-[-0.2px] text-white transition-opacity hover:opacity-70'

/** Transparent bar laid over the hero, as on cygfinance.com. */
export function SiteHeader() {
  const { token } = useAuth()
  return (
    <header className="absolute inset-x-0 top-0 z-40 py-3 lg:py-6">
      <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-4 sm:px-8">
        <a href="#top" className="mr-auto shrink-0" aria-label="CYG Finance home">
          <img
            src="/site/logo.png"
            alt="CYG Finance"
            className="h-12 w-auto brightness-0 invert sm:h-14"
          />
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={NAV_LINK}>
              {l.label}
            </a>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${NAV_LINK} flex items-center gap-1 outline-none`}
            >
              Contact us <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-48 p-2">
              <DropdownMenuItem
                className="gap-3 px-3 py-2.5 text-base"
                render={<a href="#contact" />}
              >
                <Info /> Contact Info
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-3 px-3 py-2.5 text-base"
                render={<a href="#contact-form" />}
              >
                <Mail /> Contact Form
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="#contact" className={ctaClass('brand')}>
            Contact Us
          </a>
          {token ? (
            <Link to="/account" className={ctaClass('light')}>
              My account
            </Link>
          ) : (
            <>
              <Link to="/login" className={NAV_LINK}>
                Log in
              </Link>
              <Link to="/signup" className={ctaClass('light')}>
                Sign up
              </Link>
            </>
          )}
        </nav>

        <Sheet>
          <SheetTrigger
            className="rounded-md p-2 text-white outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/40 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-7" />
          </SheetTrigger>
          <SheetContent side="top" className="rounded-b-3xl px-6 pt-14 pb-8">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="flex flex-col">
              {[
                ...NAV_LINKS,
                { label: 'Contact Info', href: '#contact' },
                { label: 'Contact Form', href: '#contact-form' },
              ].map((l) => (
                <SheetClose
                  key={l.href}
                  render={<a href={l.href} />}
                  className="py-3 text-2xl font-medium text-black"
                >
                  {l.label}
                </SheetClose>
              ))}
              <SheetClose
                render={<a href="#contact" />}
                className={ctaClass('brand', 'mt-4')}
              >
                Contact Us
              </SheetClose>
              {token ? (
                <SheetClose
                  render={<Link to="/account" />}
                  className={ctaClass('brand', 'mt-3 bg-[#0B1C2C] hover:bg-[#0B1C2C]/85')}
                >
                  My account
                </SheetClose>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <SheetClose
                    render={<Link to="/login" />}
                    className={ctaClass('light', 'border border-black/15')}
                  >
                    Log in
                  </SheetClose>
                  <SheetClose
                    render={<Link to="/signup" />}
                    className={ctaClass('brand', 'bg-[#0B1C2C] hover:bg-[#0B1C2C]/85')}
                  >
                    Sign up
                  </SheetClose>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
