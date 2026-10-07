import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMe, type UpdateMeValues } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useUpdateMe() {
  const { token, setCustomer } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateMeValues) => updateMe(token!, values),
    onSuccess: (customer) => {
      setCustomer(customer)
      queryClient.setQueryData(['customer-me'], customer)
    },
  })
}
