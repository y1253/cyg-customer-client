import { SERVICES } from './content'
import { EYEBROW, SECTION_TITLE } from './cta'

/** Dark band with the 20 service tiles (Webflow `.section.bc-dark` + `.app-card`). */
export function ServicesSection() {
  return (
    <section id="services" className="scroll-mt-6 bg-ink py-16 text-white lg:py-[100px]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="mx-auto mb-12 max-w-[600px] text-center">
          <div className={EYEBROW}>Services</div>
          <h2 className={SECTION_TITLE}>
            <span className="block text-white">Your Business</span>
            Our <span className="text-brand-light">Expertise</span>
          </h2>
          <p className="mt-6 text-lg text-white/70">Streamline Your Financial Management Process</p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <li
              key={s.label}
              className="flex h-full items-center gap-3 rounded-xl border border-black/10 bg-tile p-6 text-base font-medium text-black shadow-[-11px_0_30px_-13px_#1a1a1a] sm:p-4"
            >
              <img src={s.icon} alt="" className="size-10 shrink-0 object-contain" />
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
