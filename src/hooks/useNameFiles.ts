import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addName,
  createNameFolder,
  deleteNameFolder,
  fetchAttachmentEmail,
  fetchNameFolders,
  NAME_FOLDERS_KEY,
  phoneUploadLink,
  placeAttachment,
  renameNameFolder,
  sendWelcomeEmail,
  type FilePlace,
  type NameFolder,
} from '@/api/attachments'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** step2 (2026-11-11): the customer's subfolders inside the Names tab's name folders. */
export function useNameFolders({ enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(NAME_FOLDERS_KEY),
    queryFn: () => fetchNameFolders(book.auth),
    enabled: !!book.token && enabled,
  })
}

/** Create / rename / delete a subfolder — each answers the whole list, written straight in. */
export function useNameFolderActions() {
  const book = useBook()
  const qc = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  const set = (list: NameFolder[]) => qc.setQueryData(book.key(NAME_FOLDERS_KEY), list)
  const create = useMutation({
    mutationFn: (body: { name: string | null; parentId: number | null; title: string }) =>
      createNameFolder(book.auth, body),
    onSuccess: set,
  })
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => renameNameFolder(book.auth, id, title),
    onSuccess: set,
  })
  const remove = useMutation({
    mutationFn: (id: number) => deleteNameFolder(book.auth, id),
    onSuccess: set,
    // Its files moved up a level.
    onSettled: invalidate,
  })
  return { create, rename, remove }
}

/** Move a file to another name / subfolder, or give it its own name. */
export function usePlaceAttachment() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      name?: string | null
      folderId?: number | null
      displayName?: string | null
    }) => placeAttachment(book.auth, id, body),
    onSettled: invalidate,
  })
}

/** A name added by hand on the Names tab. */
export function useAddName() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ name, group }: { name: string; group: string | null }) => addName(book.auth, name, group),
    onSettled: invalidate,
  })
}

/** The email a file came in (fetched only while shown). */
export function useAttachmentEmail(id: number | null) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(['bookkeeping', 'attachment-email', id]),
    queryFn: () => fetchAttachmentEmail(book.auth, id!),
    enabled: !!book.token && id != null,
    staleTime: 5 * 60_000,
  })
}

/** The QR code's link — a new one each time it is asked for (30 minutes). */
export function usePhoneUploadLink() {
  const book = useBook()
  return useMutation({ mutationFn: (place: FilePlace = {}) => phoneUploadLink(book.auth, place) })
}

/** "Send a welcome email" from our inbox to an address the customer types. */
export function useWelcomeEmail() {
  const book = useBook()
  return useMutation({ mutationFn: (to: string) => sendWelcomeEmail(book.auth, to) })
}
