import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** The dark brand backdrop of the home hero, with one centred card. */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#0B1C2C] px-4 py-12">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,#169f9655,transparent_60%),radial-gradient(ellipse_at_bottom_left,#2830b340,transparent_55%)]"
      />
      <Link to="/" className="mb-8" aria-label="CYG Finance home">
        <img src="/site/logo.png" alt="CYG Finance" className="h-14 w-auto brightness-0 invert" />
      </Link>
      <Card className="w-full max-w-md rounded-2xl py-8 shadow-2xl">
        <CardHeader className="px-8">
          <CardTitle className="text-2xl font-bold tracking-[-0.02em] text-brand">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-8">{children}</CardContent>
      </Card>
      <p className="mt-6 text-sm text-white/70">{footer}</p>
    </main>
  )
}

/** "or" rule between the Google button and the email form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[2px] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

/** The submit button, in the site's brand CTA style. */
export const SUBMIT_CLASS =
  'h-12 w-full rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand/85 disabled:opacity-60'
