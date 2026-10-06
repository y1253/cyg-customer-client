import { ContactSection } from './ContactSection'
import { HeroSection } from './HeroSection'
import { ServicesSection } from './ServicesSection'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { WhatWeDoSection } from './WhatWeDoSection'

/** The public cygfinance.com site — a one-page rebuild of the old Webflow site. */
export function HomePage() {
  return (
    <div className="relative bg-white text-black">
      <SiteHeader />
      <main>
        <HeroSection />
        <WhatWeDoSection />
        <ServicesSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  )
}
