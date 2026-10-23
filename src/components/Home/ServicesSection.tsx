import { SERVICES } from './content'
import { EYEBROW, SECTION_TITLE } from './cta'

/** Dark band with one tile per feature the site ships today. */
export function ServicesSection() {
  return (
    <section id="services" className="scroll-mt-6 bg-ink py-16 text-white lg:py-[100px]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <div className={EYEBROW}>Features</div>
          <h2 className={SECTION_TITLE}>
            <span className="block text-white">Everything your books need,</span>
            in <span className="text-brand-light">one conversation</span>
          </h2>
          <p className="mt-6 text-lg text-white/70">
            Send it your statements and receipts — it does the rest, and tells you when it needs you.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ label, body, icon: Icon }) => (
            <li
              key={label}
              className="flex h-full items-start gap-4 rounded-xl border border-black/10 bg-tile p-5 text-black shadow-[-11px_0_30px_-13px_#1a1a1a]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-base font-semibold leading-snug">{label}</p>
                <p className="mt-1 text-sm leading-relaxed text-black/60">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
