import { useQuery } from '@tanstack/react-query'
import { fetchProducts, PRODUCTS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** Every item read off the customer's receipts, with its category. */
export function useProducts() {
  const { token } = useAuth()
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () => fetchProducts(token!),
    enabled: !!token,
  })
}
