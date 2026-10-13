import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  applyAttachmentItems,
  attachmentObjectUrl,
  deleteAttachment,
  fetchAttachments,
  isBusyAttachment,
  retryAttachment,
  setAttachmentTransaction,
  uploadAttachments,
} from '@/api/attachments'
import { ATTACHMENTS_KEY, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Files per request — the server's limit. */
const UPLOAD_BATCH = 20

/**
 * The customer's attachments. Polls every 4s while any is still being read; when one
 * finishes, the ledger refetches too (a receipt may have split a transaction).
 */
export function useAttachments({ enabled = true }: { enabled?: boolean } = {}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ATTACHMENTS_KEY,
    queryFn: async () => {
      const before = queryClient.getQueryData<{ status: string }[]>(ATTACHMENTS_KEY)
      const list = await fetchAttachments(token!)
      const wasBusy = before?.some((a) => a.status === 'PENDING' || a.status === 'PROCESSING')
      if (wasBusy && !list.some(isBusyAttachment)) {
        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      }
      return list
    },
    enabled: !!token && enabled,
    refetchInterval: (q) => (q.state.data?.some(isBusyAttachment) ? 4000 : false),
    refetchIntervalInBackground: true,
  })
}

/** Upload files (to one transaction, or to be matched), reporting overall progress 0..1. */
export function useUploadAttachments() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  const [progress, setProgress] = useState(0)
  const mutation = useMutation({
    mutationFn: async ({ files, transactionId = null }: { files: File[]; transactionId?: number | null }) => {
      setProgress(0)
      const total = files.reduce((s, f) => s + f.size, 0) || 1
      let done = 0
      for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
        const batch = files.slice(i, i + UPLOAD_BATCH)
        const size = batch.reduce((s, f) => s + f.size, 0)
        await uploadAttachments(token!, batch, transactionId, (f) => setProgress((done + f * size) / total))
        done += size
      }
      setProgress(1)
    },
    onSettled: invalidate,
  })
  return { ...mutation, progress }
}

/** Attach / detach, use the receipt's items, read again, delete. */
export function useAttachmentActions() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  const attach = useMutation({
    mutationFn: ({ id, transactionId }: { id: number; transactionId: number | null }) =>
      setAttachmentTransaction(token!, id, transactionId),
    onSettled: invalidate,
  })
  const applyItems = useMutation({
    mutationFn: (id: number) => applyAttachmentItems(token!, id),
    onSettled: invalidate,
  })
  const retry = useMutation({
    mutationFn: (id: number) => retryAttachment(token!, id),
    onSettled: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => deleteAttachment(token!, id),
    onSettled: invalidate,
  })
  return { attach, applyItems, retry, remove }
}

/** The protected file as an object URL while mounted; revoked on unmount or change. */
export function useAttachmentUrl(id: number | null) {
  const { token } = useAuth()
  const [state, setState] = useState<{ id: number; url: string | null; error: string | null } | null>(null)
  useEffect(() => {
    if (id == null || !token) return
    let url: string | null = null
    let alive = true
    attachmentObjectUrl(token, id).then(
      (u) => {
        url = u
        if (alive) setState({ id, url: u, error: null })
        else URL.revokeObjectURL(u)
      },
      (err: Error) => alive && setState({ id, url: null, error: err.message }),
    )
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, token])
  return state && state.id === id ? state : { id, url: null, error: null }
}
