import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  applyAttachmentItems,
  attachmentObjectUrl,
  deleteAttachment,
  fetchAttachments,
  isBusyAttachment,
  retryAttachment,
  retryAttachments,
  setAttachmentTransaction,
  uploadAttachments,
  type FilePlace,
} from '@/api/attachments'
import { ATTACHMENTS_KEY, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Files per request — the server's limit. */
const UPLOAD_BATCH = 20

/**
 * The customer's attachments. Polls every 4s while any is still being read; when one
 * finishes, the ledger refetches too (a receipt may have split a transaction).
 */
export function useAttachments({ enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: book.key(ATTACHMENTS_KEY),
    queryFn: async () => {
      const before = queryClient.getQueryData<{ status: string }[]>(book.key(ATTACHMENTS_KEY))
      const list = await fetchAttachments(book.auth)
      const wasBusy = before?.some((a) => a.status === 'PENDING' || a.status === 'PROCESSING')
      if (wasBusy && !list.some(isBusyAttachment)) {
        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      }
      return list
    },
    enabled: !!book.token && enabled,
    refetchInterval: (q) => (q.state.data?.some(isBusyAttachment) ? 4000 : false),
    refetchIntervalInBackground: true,
  })
}

/** Upload files (to one transaction, or to be matched), reporting overall progress 0..1. */
export function useUploadAttachments() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  const [progress, setProgress] = useState(0)
  const mutation = useMutation({
    mutationFn: async ({
      files,
      transactionId = null,
      place = {},
    }: {
      files: File[]
      transactionId?: number | null
      /** step2: into a name's folder (and subfolder) on the Names tab. */
      place?: FilePlace
    }) => {
      setProgress(0)
      const total = files.reduce((s, f) => s + f.size, 0) || 1
      let done = 0
      for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
        const batch = files.slice(i, i + UPLOAD_BATCH)
        const size = batch.reduce((s, f) => s + f.size, 0)
        await uploadAttachments(book.auth, batch, transactionId, (f) => setProgress((done + f * size) / total), place)
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
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  const attach = useMutation({
    mutationFn: ({ id, transactionId }: { id: number; transactionId: number | null }) =>
      setAttachmentTransaction(book.auth, id, transactionId),
    onSettled: invalidate,
  })
  const applyItems = useMutation({
    mutationFn: (id: number) => applyAttachmentItems(book.auth, id),
    onSettled: invalidate,
  })
  const retry = useMutation({
    mutationFn: (id: number) => retryAttachment(book.auth, id),
    onSettled: invalidate,
  })
  const retryAll = useMutation({
    mutationFn: (ids: number[]) => retryAttachments(book.auth, ids),
    onSettled: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => deleteAttachment(book.auth, id),
    onSettled: invalidate,
  })
  return { attach, applyItems, retry, retryAll, remove }
}

/** The protected file as an object URL while mounted; revoked on unmount or change. */
export function useAttachmentUrl(
  id: number | null,
  /** step9: changes when the file itself changes (a re-read cut it), so it is fetched again. */
  version = '',
  /** step9: the whole image a cropped file was cut out of; 'raw' = as sent (step2, 2026-11-13). */
  original: boolean | 'raw' = false,
) {
  const { token, companyId, bookId } = useBook()
  const [state, setState] = useState<{ id: number; url: string | null; error: string | null } | null>(null)
  useEffect(() => {
    if (id == null || !token) return
    let url: string | null = null
    let alive = true
    attachmentObjectUrl({ token, companyId, bookId }, id, original).then(
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
  }, [id, token, companyId, bookId, version, original])
  return state && state.id === id ? state : { id, url: null, error: null }
}
