import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMES_KEY, setNameFields, type NameField } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** step2 (2026-11-09): save a name's profile fields (phone, email, …) — the whole list. */
export function useNameFields() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; fields: NameField[] }) => setNameFields(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
  })
}
