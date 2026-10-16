import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, MessagesSquare, Phone, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import {
  useCreateRegistration,
  useDiscardRegistration,
  useRegistrations,
} from '@/hooks/useRegistrations'

/**
 * `/dashboard/register` — the customer's businesses: applications in progress (Continue)
 * and submitted ones with their phone number ("Messages & links" opens the read-only
 * portal). "Register a business" starts a new draft.
 */
export function RegistrationsPage() {
  const navigate = useNavigate()
  const list = useRegistrations()
  const create = useCreateRegistration()
  const discard = useDiscardRegistration()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  function start() {
    create.mutate(undefined, {
      onSuccess: ({ id }) => navigate(`/dashboard/register/${id}`),
    })
  }

  const rows = list.data ?? []

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="My businesses"
        description="Register your business with CYG Finance. Your answers are saved as you go."
        actions={
          <Button onClick={start} disabled={create.isPending} className="gap-1.5">
            <Plus size={16} />
            {create.isPending ? 'Starting…' : 'Register a business'}
          </Button>
        }
      />
      {create.error && <p className="mb-4 text-sm text-destructive">{create.error.message}</p>}

      {list.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : list.isError ? (
        <p className="text-sm text-destructive">{list.error.message}</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You have not registered a business yet.</p>
            <Button onClick={start} disabled={create.isPending}>
              Start your application
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{r.businessName ?? 'New application'}</p>
                    {r.isDraft ? (
                      <Badge variant="secondary">In progress</Badge>
                    ) : (
                      <Badge>Submitted</Badge>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {r.isDraft ? (
                      `Started ${new Date(r.createdAt).toLocaleDateString()}`
                    ) : r.supportNumber ? (
                      <>
                        <Phone size={12} /> {r.supportNumber}
                      </>
                    ) : (
                      'Your phone number is being set up.'
                    )}
                  </p>
                </div>
                {!r.isDraft && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => navigate(`/dashboard/businesses/${r.id}`)}
                  >
                    <MessagesSquare size={14} /> Messages &amp; links <ChevronRight size={14} />
                  </Button>
                )}
                {r.isDraft && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      disabled={discard.isPending}
                      onClick={() => setConfirmId(r.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/dashboard/register/${r.id}`)}
                    >
                      Continue <ChevronRight size={14} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this application?</DialogTitle>
            <DialogDescription>
              Your answers will be lost, and any email you connected to it will be disconnected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={discard.isPending}
              onClick={() =>
                confirmId !== null &&
                discard.mutate(confirmId, { onSuccess: () => setConfirmId(null) })
              }
            >
              {discard.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
