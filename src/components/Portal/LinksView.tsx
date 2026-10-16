import { useState } from 'react'
import { Check, Copy, ExternalLink, Eye, EyeOff, KeyRound, Link2, StickyNote, User } from 'lucide-react'
import type { PortalLink } from '@/api/portal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePortalLinks } from '@/hooks/usePortal'

/** The company's saved links and logins, as our team keeps them. Read-only. */
export function LinksView({ companyId }: { companyId: number }) {
  const links = usePortalLinks(companyId)

  if (links.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }
  if (links.isError) return <p className="text-sm text-destructive">{links.error.message}</p>
  if (links.data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No links have been saved for this business yet.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.data.map((l) => (
        <LinkCard key={l.id} link={l} />
      ))}
    </div>
  )
}

function LinkCard({ link }: { link: PortalLink }) {
  const [show, setShow] = useState(false)
  const href = link.url && !/^https?:\/\//i.test(link.url) ? `https://${link.url}` : link.url

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-[#0B1C2C]">{link.label}</p>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#1f8f86] hover:underline"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {link.url && <p className="-mt-2 truncate text-xs text-muted-foreground">{link.url}</p>}

        {(link.username || link.password) && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5">
            {link.username && (
              <Field icon={<User className="h-3.5 w-3.5" />} value={link.username} copy={link.username} />
            )}
            {link.password && (
              <Field
                icon={<KeyRound className="h-3.5 w-3.5" />}
                value={show ? link.password : '•'.repeat(Math.min(link.password.length, 12))}
                mono
                copy={link.password}
                extra={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                }
              />
            )}
          </div>
        )}

        {link.note && (
          <p className="flex gap-1.5 text-xs whitespace-pre-wrap text-muted-foreground">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {link.note}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Field({
  icon,
  value,
  copy,
  mono,
  extra,
}: {
  icon: React.ReactNode
  value: string
  copy: string
  mono?: boolean
  extra?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className={`min-w-0 flex-1 truncate ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
      {extra}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Copy"
        onClick={() => {
          void navigator.clipboard.writeText(copy).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <Check className="text-emerald-600" /> : <Copy />}
      </Button>
    </div>
  )
}
