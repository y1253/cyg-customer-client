import { useQuery } from '@tanstack/react-query'
import { fetchProducts, PRODUCTS_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** Every item read off the customer's receipts, with its category. */
export function useProducts() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(PRODUCTS_KEY),
    queryFn: () => fetchProducts(book.auth),
    enabled: !!book.token,
  })
}
