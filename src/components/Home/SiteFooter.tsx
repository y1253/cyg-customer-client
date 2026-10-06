import { CONTACT, NAV_LINKS } from './content'
import { ctaClass } from './cta'

const LINK = 'mb-3 block text-base text-white/50 transition-opacity hover:text-white'
const TITLE = 'mb-6 text-xl font-extrabold'

export function SiteFooter() {
  return (
    <footer className="bg-ink pb-8 text-white">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="flex flex-col gap-8 py-16 lg:flex-row lg:items-end lg:justify-between">
          <h3 className="max-w-2xl text-[30px] font-bold leading-[1.2] tracking-[-0.02em] lg:text-[44px]">
            We work behind the scenes,{' '}
            <span className="text-brand-light">so you can be on scene.</span>
          </h3>
          <div className="flex flex-wrap gap-4">
            <a href="#contact" className={ctaClass('light')}>
              Talk to an Expert
            </a>
            <a href="#contact" className={ctaClass('brand')}>
              Contact Us
            </a>
          </div>
        </div>

        <div className="grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:pt-16">
          <a href="#top" aria-label="CYG Finance home">
            <img src="/site/logo.png" alt="CYG Finance" className="w-[164px] brightness-0 invert" />
          </a>
          <div>
            <div className={TITLE}>Company</div>
            <a href="#top" className={LINK}>Home</a>
            <a href="#what-we-do" className={LINK}>About Us</a>
            <a href="#contact" className={LINK}>Contact</a>
          </div>
          <div>
            <div className={TITLE}>Site Map</div>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={LINK}>
                {l.label}
              </a>
            ))}
          </div>
          <div>
            <div className={TITLE}>Contact</div>
            <a href={`mailto:${CONTACT.email}`} className={LINK}>
              {CONTACT.email}
            </a>
            <a href={CONTACT.phoneHref} className={LINK}>
              Phone: 855-CYG-FINA
              <br />
              (855-294-3462)
            </a>
          </div>
        </div>

        <p className="mt-12 border-t border-white/10 pt-8 text-sm text-white/50">
          Copyright © {new Date().getFullYear()} CYG Finance. All Rights Reserved.
        </p>
      </div>
    </footer>
  )
}
