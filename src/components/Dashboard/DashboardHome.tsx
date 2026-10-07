import { ArrowRight, FileStack, ListOrdered, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useStatements } from '@/hooks/useStatements'
import { cn } from '@/lib/utils'
import { MODULES } from './nav'
import { PageHeader } from './PageHeader'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const MODULE_BLURB: Record<string, string> = {
  Bookkeeping:
    'Upload your bank statements and get every transaction posted as debits and credits — ready for your accountant.',
  Invoices: 'Create and send invoices, and see who has paid.',
  'Tax filing': 'Your sales-tax and income-tax filings in one place.',
  Payroll: 'Pay your team and keep payroll records.',
}

export function DashboardHome() {
  const { customer } = useAuth()
  const statements = useStatements()
  const list = statements.data ?? []
  const transactions = list.reduce((n, s) => n + s.transactionCount, 0)
  const last = list[0]?.createdAt

  const stats = [
    { label: 'Statements uploaded', value: list.length.toLocaleString(), icon: FileStack },
    { label: 'Transactions posted', value: transactions.toLocaleString(), icon: ListOrdered },
    {
      label: 'Last upload',
      value: last
        ? new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      icon: UploadCloud,
    },
  ]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${customer?.name.split(' ')[0] ?? 'there'}`}
        description="Here is everything CYG Finance is doing for your business."
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border-0 py-5 shadow-sm ring-1 ring-black/5">
            <CardContent className="flex items-center gap-4 px-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {statements.isLoading ? (
                  <Skeleton className="mt-1 h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight text-[#0B1C2C]">{value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold text-[#0B1C2C]">Your services</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.filter((m) => m.label !== 'Overview').map((m) => {
          const Icon = m.icon
          const body = (
            <Card
              className={cn(
                'h-full rounded-2xl border-0 py-6 shadow-sm ring-1 ring-black/5 transition-all',
                m.soon ? 'opacity-60' : 'group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-brand/40',
              )}
            >
              <CardContent className="flex h-full flex-col gap-4 px-6">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'flex size-12 items-center justify-center rounded-xl',
                      m.soon ? 'bg-muted text-muted-foreground' : 'bg-brand text-white',
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  {m.soon ? (
                    <Badge variant="secondary">Coming soon</Badge>
                  ) : (
                    <ArrowRight className="size-5 text-brand transition-transform group-hover:translate-x-1" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0B1C2C]">{m.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {MODULE_BLURB[m.label]}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
          return m.soon ? (
            <div key={m.label}>{body}</div>
          ) : (
            <Link key={m.label} to={m.to} className="group rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-brand/40">
              {body}
            </Link>
          )
        })}
      </div>
    </>
  )
}
