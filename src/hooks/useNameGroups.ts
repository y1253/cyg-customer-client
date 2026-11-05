import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteNameGroup, NAMES_KEY, saveNameGroup, searchNames, setNameGroup } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** step9: put a name in a Names-tab group (a label: its accounts and tax stay). */
export function useSetNameGroup() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; group: string | null }) => setNameGroup(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
  })
}

/** step9: create (no id) or rename one of the customer's own groups. */
export function useSaveNameGroup() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { id?: number; name: string }) => saveNameGroup(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
  })
}

/** step9: remove a group — its names go back to following their category. */
export function useDeleteNameGroup() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteNameGroup(book.auth, id),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
  })
}

/**
 * step9: the Names-tab search by bank description — which names have rows whose description
 * contains the text. Waits for the customer to stop typing; under 2 characters asks nothing.
 */
export function useNameSearch(query: string) {
  const book = useBook()
  const [q, setQ] = useState(query.trim())
  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])
  return useQuery({
    queryKey: book.key([...NAMES_KEY, 'search', q]),
    queryFn: () => searchNames(book.auth, q),
    enabled: !!book.token && q.length >= 2,
    staleTime: 30_000,
  })
}
