import { useMutation, useQueryClient } from '@tanstack/react-query'
import { INTAKE_KEY } from '@/api/bookkeeping'
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
      // Texts to our numbers are matched on this phone.
      void queryClient.invalidateQueries({ queryKey: INTAKE_KEY })
    },
  })
}
