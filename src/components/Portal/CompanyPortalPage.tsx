import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Link2, Lock, MessagesSquare } from 'lucide-react'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PortalUnlockProvider, usePortalUnlock } from '@/context/PortalUnlockContext'
import { usePortalCompanies, usePortalOverview } from '@/hooks/usePortal'
import { CommunicationsView } from './CommunicationsView'
import { LinksView } from './LinksView'
import { UnlockGate } from './UnlockGate'

/**
 * `/dashboard/businesses/:id` — a submitted business's Communications and Links, behind
 * the emailed code. The unlock lives in memory for as long as the customer stays on
 * these pages, so moving between their businesses does not ask again.
 */
export function CompanyPortalPage() {
  return (
    <PortalUnlockProvider>
      <PortalPage />
    </PortalUnlockProvider>
  )
}

function PortalPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'links' ? 'links' : 'communications'
  const companies = usePortalCompanies()
  const { unlockToken, lock } = usePortalUnlock()
  const overview = usePortalOverview(id)

  const name =
    overview.data?.businessName ?? companies.data?.find((c) => c.id === id)?.businessName ?? 'Your business'
  const list = companies.data ?? []

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        to="/dashboard/register"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> My businesses
      </Link>
      <PageHeader
        title={name}
        description="Everything our team receives and sends for your business."
        actions={
          <>
            {list.length > 1 && (
              <Select
                value={String(id)}
                onValueChange={(v) => v && navigate(`/dashboard/businesses/${v}?tab=${tab}`)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue>{(v: string) => list.find((c) => String(c.id) === v)?.businessName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {list.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {unlockToken && (
              <Button variant="outline" className="gap-1.5" onClick={lock}>
                <Lock className="h-4 w-4" /> Lock
              </Button>
            )}
          </>
        }
      />

      {!unlockToken ? (
        <UnlockGate />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: String(v) }, { replace: true })} className="gap-6">
          <TabsList>
            <TabsTrigger value="communications" className="px-4">
              <MessagesSquare /> Communications
            </TabsTrigger>
            <TabsTrigger value="links" className="px-4">
              <Link2 /> Links
            </TabsTrigger>
          </TabsList>
          <TabsContent value="communications">
            {overview.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : overview.isError ? (
              <p className="text-sm text-destructive">{overview.error.message}</p>
            ) : (
              <CommunicationsView key={id} companyId={id} overview={overview.data} />
            )}
          </TabsContent>
          <TabsContent value="links">
            <LinksView companyId={id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
