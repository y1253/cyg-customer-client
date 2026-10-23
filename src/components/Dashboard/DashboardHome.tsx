import { ArrowRight, FileStack, ListOrdered, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TextReceiptsCard } from '@/components/Bookkeeping/TextReceiptsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useStatements } from '@/hooks/useStatements'
import { visibleModules } from './nav'
import { PageHeader } from './PageHeader'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const MODULE_BLURB: Record<string, string> = {
  Bookkeeping:
    'Upload your bank statements or connect your bank, and get every transaction posted as debits and credits. Keep as many companies as you need, each with its own books.',
  'AI assistant':
    'Ask about your books, file a receipt or set up a report — the same assistant answers your texts, WhatsApps, emails and calls.',
  Contacts: 'People the AI can call or text for you — saved when you ask it to call someone.',
}

export function DashboardHome() {
  const { customer } = useAuth()
  const assistant = useAssistantEnabled()
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

      <TextReceiptsCard className="mb-10" />

      <h2 className="mb-4 text-lg font-semibold text-[#0B1C2C]">Your services</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {visibleModules(assistant)
          .filter((m) => m.label !== 'Overview')
          .map((m) => {
            const Icon = m.icon
            return (
              <Link
                key={m.label}
                to={m.to}
                className="group rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
              >
                <Card className="h-full rounded-2xl border-0 py-6 shadow-sm ring-1 ring-black/5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-brand/40">
                  <CardContent className="flex h-full flex-col gap-4 px-6">
                    <div className="flex items-center justify-between">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-white">
                        <Icon className="size-6" />
                      </span>
                      <ArrowRight className="size-5 text-brand transition-transform group-hover:translate-x-1" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0B1C2C]">{m.label}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {MODULE_BLURB[m.label]}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
      </div>
    </>
  )
}
