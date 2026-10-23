import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NAV_LINKS } from './content'
import { HeaderAccountDesktop, HeaderAccountMobile } from './HeaderAccount'
import { ctaClass } from './cta'

const NAV_LINK =
  'whitespace-nowrap py-3 text-lg font-medium tracking-[-0.2px] text-white transition-opacity hover:opacity-70'

/** Transparent bar laid over the hero, as on cygfinance.com. */
export function SiteHeader() {
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
          <a href="#contact" className={ctaClass('brand')}>
            Contact Us
          </a>
          <HeaderAccountDesktop />
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
              {NAV_LINKS.map((l) => (
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
              <HeaderAccountMobile />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
