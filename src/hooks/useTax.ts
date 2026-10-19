import { useQuery } from '@tanstack/react-query'
import { fetchTax, TAX_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** The customer's tax agencies (which names they tax is on the Names tab). */
export function useTax() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(TAX_KEY),
    queryFn: () => fetchTax(book.auth),
    enabled: !!book.token,
  })
}
