import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Shared shell for the public policy pages (privacy, security). */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-brand hover:opacity-80">
          <ArrowLeft size={15} />
          Back to cygfinance.com
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-ink">{title}</h1>
        <p className="mb-10 text-sm text-gray-500">Last updated: {updated}</p>
        <div className="space-y-8 text-[15px] leading-relaxed text-gray-700">{children}</div>
        <div className="mt-14 border-t border-gray-100 pt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} CYG Finance ·{' '}
          <Link to="/privacy" className="text-brand hover:opacity-80">Privacy Policy</Link> ·{' '}
          <Link to="/security-policy" className="text-brand hover:opacity-80">Security Policy</Link>
        </div>
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6">{children}</ul>
}

export function LegalContact() {
  return (
    <p>
      <a href="mailto:office@cygfinance.com" className="text-brand underline">office@cygfinance.com</a>
      <br />
      CYG Finance, 867 McEachran Avenue, Outremont, QC H2V 3C9, Canada
      <br />
      <a href="tel:+18552943462" className="text-brand underline">855-294-3462</a>
    </p>
  )
}
