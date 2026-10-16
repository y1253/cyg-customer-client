import { useMemo } from 'react'
import type { PortalOverview } from '@/api/portal'
import { usePortalChats, usePortalEmails, usePortalPhone, usePortalWhatsApp } from '@/hooks/usePortal'
import {
  clampSources,
  matchesFilters,
  sourcesFor,
  type KindFilter,
  type PortalItem,
  type Source,
  type SourceKind,
  type StatusFilter,
} from './unified-inbox'

/**
 * One business's channels as ONE list. Each channel keeps its own infinite query; a
 * channel is fetched only when it is connected AND the type filter can show it.
 * "Load more" pages whichever channel is holding the list back (`clampSources`).
 */
export function useUnifiedPortalInbox(
  companyId: number,
  overview: PortalOverview,
  kind: KindFilter,
  status: StatusFilter,
  search: string,
) {
  const wanted = sourcesFor(kind)
  const on: Record<SourceKind, boolean> = {
    email: !!overview.mailbox && wanted.email,
    chat: !!overview.mailbox && wanted.chat,
    phone: !!overview.supportNumber && wanted.phone,
    whatsapp: !!overview.whatsappNumber && wanted.whatsapp,
  }
  const sent = kind === 'sent'

  const email = usePortalEmails(companyId, sent ? 'SENT' : 'INBOX', on.email)
  const chat = usePortalChats(companyId, on.chat)
  const phone = usePortalPhone(companyId, on.phone)
  const whatsapp = usePortalWhatsApp(companyId, on.whatsapp)
  const queries = { email, chat, phone, whatsapp }

  const merged = useMemo(() => {
    // Source order is the tie-break for which channel pages next: email first, as in
    // the staff app.
    const sources: Source[] = []
    if (on.email) {
      sources.push({
        kind: 'email',
        hasNext: !!email.hasNextPage,
        items: (email.data?.pages.flatMap((p) => p.messages) ?? []).map((data) => ({ kind: 'email', data, sent })),
      })
    }
    if (on.chat) {
      sources.push({
        kind: 'chat',
        hasNext: !!chat.hasNextPage,
        items: (chat.data?.pages.flatMap((p) => p.messages) ?? []).map((data) => ({ kind: 'chat', data })),
      })
    }
    if (on.phone) {
      sources.push({
        kind: 'phone',
        hasNext: !!phone.hasNextPage,
        items: (phone.data?.pages.flatMap((p) => p.items) ?? []).map(
          (data): PortalItem => (data.kind === 'call' ? { kind: 'call', data } : { kind: 'sms', data }),
        ),
      })
    }
    if (on.whatsapp) {
      sources.push({
        kind: 'whatsapp',
        hasNext: !!whatsapp.hasNextPage,
        items: (whatsapp.data?.pages.flatMap((p) => p.items) ?? []).map((data) => ({ kind: 'whatsapp', data })),
      })
    }
    return clampSources(sources)
  }, [
    on.email,
    on.chat,
    on.phone,
    on.whatsapp,
    sent,
    email.data,
    chat.data,
    phone.data,
    whatsapp.data,
    email.hasNextPage,
    chat.hasNextPage,
    phone.hasNextPage,
    whatsapp.hasNextPage,
  ])

  const items = useMemo(
    () => merged.items.filter((i) => matchesFilters(i, kind, status, search)),
    [merged.items, kind, status, search],
  )

  const active = (Object.keys(on) as SourceKind[]).filter((k) => on[k])
  const holding = merged.holdingBack ? queries[merged.holdingBack] : null

  return {
    items,
    /** Loaded rows before the filters, so "nothing matches" differs from "nothing yet". */
    loadedCount: merged.items.length,
    isPending: active.some((k) => queries[k].isPending),
    /** Channels that failed. The others still show; one bad channel never blanks the list. */
    failed: active.filter((k) => queries[k].error),
    hasMore: !!holding,
    loadingMore: active.some((k) => queries[k].isFetchingNextPage),
    loadMore: () => void holding?.fetchNextPage(),
    needsReconnect: on.email && !!email.data?.pages.some((p) => p.needsReconnect),
    chatStatus: on.chat ? chat.data?.pages[0]?.chatStatus : undefined,
  }
}
