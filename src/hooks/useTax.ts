import { useQuery } from '@tanstack/react-query'
import { fetchTax, TAX_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** The customer's split rules (which names they split is on the Names tab). */
export function useTax() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(TAX_KEY),
    queryFn: () => fetchTax(book.auth),
    enabled: !!book.token,
  })
}
