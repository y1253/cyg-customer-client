import { useEffect, useState } from 'react'
import { Inbox, Loader2, PlugZap, Search, SearchX } from 'lucide-react'
import type { PortalOverview } from '@/api/portal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPhone } from '@/lib/portal-format'
import { Notice, PortalRow } from './ChannelLists'
import type { Selection } from './portal-types'
import { ThreadSheet } from './ThreadSheet'
import { CHAT_NOTICE, itemKey, type KindFilter, type SourceKind, type StatusFilter } from './unified-inbox'
import { useUnifiedPortalInbox } from './useUnifiedPortalInbox'

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'Any status',
  unread: 'Unread',
  uncompleted: 'Not completed',
}

const FAILED_LABEL: Record<SourceKind, string> = {
  email: 'emails',
  chat: 'chat messages',
  phone: 'calls and texts',
  whatsapp: 'WhatsApp messages',
}

type Saved = { kind: KindFilter; status: StatusFilter }

function loadSaved(companyId: number): Saved | null {
  try {
    const raw = localStorage.getItem(`portal-comm-${companyId}`)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

/**
 * Every channel our team handles for this business in ONE list, newest first, with a
 * type / status / search filter — the same layout as the staff app's Communications tab.
 * Read-only: each message carries a Read / Completed tag and nothing here changes either.
 */
export function CommunicationsView({ companyId, overview }: { companyId: number; overview: PortalOverview }) {
  const [selection, setSelection] = useState<Selection | null>(null)

  const chatLabel = overview.mailbox?.provider === 'MICROSOFT' ? 'Teams' : 'Chat'
  const kindOptions = (
    [
      ['all', 'Everything', true],
      ['email', 'Emails', !!overview.mailbox],
      ['sent', 'Sent emails', !!overview.mailbox],
      ['chat', chatLabel, !!overview.mailbox],
      ['calls', 'Calls', !!overview.supportNumber],
      ['voicemail', 'Voicemails', !!overview.supportNumber],
      ['texts', 'Texts', !!overview.supportNumber],
      ['whatsapp', 'WhatsApp', !!overview.whatsappNumber],
    ] as const
  ).filter(([, , shown]) => shown)
  const kindLabel = Object.fromEntries(kindOptions.map(([k, l]) => [k, l])) as Partial<Record<KindFilter, string>>

  const [kind, setKind] = useState<KindFilter>(() => {
    const k = loadSaved(companyId)?.kind
    return k && k in kindLabel ? k : 'all'
  })
  const [status, setStatus] = useState<StatusFilter>(() => {
    const s = loadSaved(companyId)?.status
    return s && s in STATUS_LABEL ? s : 'all'
  })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => {
    try {
      localStorage.setItem(`portal-comm-${companyId}`, JSON.stringify({ kind, status }))
    } catch {
      // Private window or blocked storage: the filter just isn't remembered.
    }
  }, [companyId, kind, status])

  const inbox = useUnifiedPortalInbox(companyId, overview, kind, status, search)

  if (!overview.mailbox && !overview.supportNumber && !overview.whatsappNumber) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <PlugZap className="h-10 w-10 text-muted-foreground" />
        <p className="max-w-sm text-sm text-muted-foreground">
          No mailbox, phone line or WhatsApp is connected to this business yet.
        </p>
      </Card>
    )
  }

  const identities = [
    overview.mailbox?.emailAddress,
    overview.supportNumber && `Line ${formatPhone(overview.supportNumber)}`,
    overview.whatsappNumber && `WhatsApp ${formatPhone(overview.whatsappNumber)}`,
  ].filter(Boolean)
  const filtered = kind !== 'all' || status !== 'all' || search.trim() !== ''

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search names, subjects, messages…"
              className="pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => setKind((v as KindFilter | null) ?? 'all')}>
              <SelectTrigger className="flex-1 sm:w-40">
                <SelectValue>{(v: KindFilter) => kindLabel[v] ?? 'Everything'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kindOptions.map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus((v as StatusFilter | null) ?? 'all')}>
              <SelectTrigger className="flex-1 sm:w-40">
                <SelectValue>{(v: StatusFilter) => STATUS_LABEL[v]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {identities.length > 0 && <p className="text-xs text-muted-foreground">{identities.join(' · ')}</p>}

        {inbox.needsReconnect && <Notice>We can't reach this mailbox right now. Our team has been notified.</Notice>}
        {inbox.chatStatus && inbox.chatStatus !== 'ok' && CHAT_NOTICE[inbox.chatStatus] && (
          <Notice>{CHAT_NOTICE[inbox.chatStatus]}</Notice>
        )}
        {inbox.failed.length > 0 && (
          <Notice>
            We could not load your {inbox.failed.map((k) => FAILED_LABEL[k]).join(' or ')} right now.
          </Notice>
        )}

        {inbox.isPending ? (
          <Card className="gap-0 overflow-hidden py-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 border-b px-4 py-4 last:border-b-0">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </Card>
        ) : inbox.items.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            {filtered && inbox.loadedCount > 0 ? (
              <>
                <SearchX className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nothing matches {inbox.hasMore ? 'in what is loaded so far' : 'these filters'}.
                </p>
              </>
            ) : (
              <>
                <Inbox className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              </>
            )}
          </Card>
        ) : (
          <Card className="gap-0 overflow-hidden py-0">
            {inbox.items.map((item) => (
              <PortalRow key={itemKey(item)} item={item} chatLabel={chatLabel} onOpen={setSelection} />
            ))}
          </Card>
        )}

        {!inbox.isPending && inbox.hasMore && (
          <Button variant="outline" className="self-center" onClick={inbox.loadMore} disabled={inbox.loadingMore}>
            {inbox.loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {inbox.loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </div>
      <ThreadSheet companyId={companyId} selection={selection} onClose={() => setSelection(null)} />
    </>
  )
}
