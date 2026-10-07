import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

/** The signed-in customer's profile, fresh from the server; also refreshes the cached copy. */
export function useMe() {
  const { token, setCustomer } = useAuth()
  return useQuery({
    queryKey: ['customer-me'],
    queryFn: async () => {
      const customer = await fetchMe(token!)
      setCustomer(customer)
      return customer
    },
    enabled: !!token,
  })
}
