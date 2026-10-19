import { useQuery } from '@tanstack/react-query'
import { fetchNames, NAMES_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** Every payee name the AI read, with its category, type and tax switch. */
export function useNames() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(NAMES_KEY),
    queryFn: () => fetchNames(book.auth),
    enabled: !!book.token,
  })
}
