import { Mail, Phone } from 'lucide-react'
import { CONTACT } from './content'
import { SECTION_TITLE } from './cta'

/**
 * A slim contact strip: the office email and phone. The old contact form was removed
 * 2026-10-23 (step12c) — the API's `POST /api/contact` and `api/contact.ts` still exist.
 */
export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-6 bg-white py-16 lg:py-[100px]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h2 className={SECTION_TITLE}>Talk to a person</h2>
          <p className="mt-6 text-lg text-black/70">
            The assistant handles the day-to-day, and our accountants are always there behind it.
            Reach the CYG Finance office directly any time.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${CONTACT.email}`}
            className="group flex items-center gap-4 rounded-xl bg-[#f9f9f9] p-5 transition-colors hover:bg-brand/10"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Mail className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[2px] text-black/50">
                Email us
              </span>
              <span className="block truncate text-base font-medium text-black group-hover:text-brand">
                {CONTACT.email}
              </span>
            </span>
          </a>
          <a
            href={CONTACT.phoneHref}
            className="group flex items-center gap-4 rounded-xl bg-[#f9f9f9] p-5 transition-colors hover:bg-brand/10"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Phone className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[2px] text-black/50">
                Call us
              </span>
              <span className="block text-base font-medium text-black group-hover:text-brand">
                {CONTACT.phoneLabel}
              </span>
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
