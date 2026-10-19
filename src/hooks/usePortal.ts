import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import {
  PortalLockedError,
  getPortalCallRecordings,
  getPortalChatThread,
  getPortalChats,
  getPortalEmailThread,
  getPortalEmails,
  getPortalLinks,
  getPortalOverview,
  getPortalPhoneTimeline,
  getPortalSmsThread,
  getPortalTasks,
  getPortalWhatsAppThread,
  getPortalWhatsAppTimeline,
  listPortalCompanies,
  sendPortalCode,
  verifyPortalCode,
} from '@/api/portal'
import { useAuth } from '@/context/AuthContext'
import { usePortalUnlock } from '@/context/PortalUnlockContext'

/** Shared plumbing: both tokens, locked → gate, never retry a lock. */
function usePortalAccess() {
  const { token } = useAuth()
  const { unlockToken, lock } = usePortalUnlock()
  const ready = !!token && !!unlockToken
  async function run<T>(fn: (token: string, unlock: string) => Promise<T>): Promise<T> {
    try {
      return await fn(token!, unlockToken!)
    } catch (err) {
      if (err instanceof PortalLockedError) lock()
      throw err
    }
  }
  return { ready, run }
}

const retry = (count: number, err: Error) => !(err instanceof PortalLockedError) && count < 1

export function usePortalCompanies() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['portal', 'companies'],
    queryFn: () => listPortalCompanies(token!),
    enabled: !!token,
  })
}

export function useSendPortalCode() {
  const { token } = useAuth()
  return useMutation({ mutationFn: () => sendPortalCode(token!) })
}

export function useVerifyPortalCode() {
  const { token } = useAuth()
  const { unlock } = usePortalUnlock()
  return useMutation({
    mutationFn: (code: string) => verifyPortalCode(token!, code),
    onSuccess: ({ unlockToken }) => unlock(unlockToken),
  })
}

export function usePortalOverview(id: number) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'overview'],
    queryFn: () => run((t, u) => getPortalOverview(t, u, id)),
    enabled: ready,
    retry,
  })
}

export function usePortalTasks(id: number) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'tasks'],
    queryFn: () => run((t, u) => getPortalTasks(t, u, id)),
    enabled: ready,
    retry,
  })
}

export function usePortalLinks(id: number) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'links'],
    queryFn: () => run((t, u) => getPortalLinks(t, u, id)),
    enabled: ready,
    retry,
  })
}

export function usePortalEmails(id: number, folder: 'INBOX' | 'SENT', enabled: boolean) {
  const { ready, run } = usePortalAccess()
  return useInfiniteQuery({
    queryKey: ['portal', id, 'emails', folder],
    queryFn: ({ pageParam }) =>
      run((t, u) => getPortalEmails(t, u, id, folder, pageParam || undefined)),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: ready && enabled,
    retry,
  })
}

export function usePortalEmailThread(id: number, threadId: string | null) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'email-thread', threadId],
    queryFn: () => run((t, u) => getPortalEmailThread(t, u, id, threadId!)),
    enabled: ready && !!threadId,
    retry,
  })
}

export function usePortalChats(id: number, enabled: boolean) {
  const { ready, run } = usePortalAccess()
  return useInfiniteQuery({
    queryKey: ['portal', id, 'chats'],
    queryFn: ({ pageParam }) => run((t, u) => getPortalChats(t, u, id, pageParam || undefined)),
    initialPageParam: '',
    getNextPageParam: (last) => (last.hasMore && last.nextCursor ? last.nextCursor : undefined),
    enabled: ready && enabled,
    retry,
  })
}

export function usePortalChatThread(id: number, spaceId: string | null) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'chat-thread', spaceId],
    queryFn: () => run((t, u) => getPortalChatThread(t, u, id, spaceId!)),
    enabled: ready && !!spaceId,
    retry,
  })
}

export function usePortalPhone(id: number, enabled: boolean) {
  const { ready, run } = usePortalAccess()
  return useInfiniteQuery({
    queryKey: ['portal', id, 'phone'],
    queryFn: ({ pageParam }) =>
      run((t, u) => getPortalPhoneTimeline(t, u, id, pageParam || undefined)),
    initialPageParam: '',
    getNextPageParam: (last) => (last.hasMore && last.nextCursor ? last.nextCursor : undefined),
    enabled: ready && enabled,
    retry,
  })
}

export function usePortalSmsThread(id: number, peer: string | null) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'sms-thread', peer],
    queryFn: () => run((t, u) => getPortalSmsThread(t, u, id, peer!)),
    enabled: ready && !!peer,
    retry,
  })
}

export function usePortalCallRecordings(id: number, sid: string | null) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'recordings', sid],
    queryFn: () => run((t, u) => getPortalCallRecordings(t, u, id, sid!)),
    enabled: ready && !!sid,
    retry,
  })
}

export function usePortalWhatsApp(id: number, enabled: boolean) {
  const { ready, run } = usePortalAccess()
  return useInfiniteQuery({
    queryKey: ['portal', id, 'whatsapp'],
    queryFn: ({ pageParam }) =>
      run((t, u) => getPortalWhatsAppTimeline(t, u, id, pageParam || undefined)),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore && last.nextCursor ? last.nextCursor : undefined),
    enabled: ready && enabled,
    retry,
  })
}

export function usePortalWhatsAppThread(id: number, peer: string | null) {
  const { ready, run } = usePortalAccess()
  return useQuery({
    queryKey: ['portal', id, 'whatsapp-thread', peer],
    queryFn: () => run((t, u) => getPortalWhatsAppThread(t, u, id, peer!)),
    enabled: ready && !!peer,
    retry,
  })
}
