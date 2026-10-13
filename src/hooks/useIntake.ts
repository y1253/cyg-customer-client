import { useQuery } from '@tanstack/react-query'
import { fetchIntake } from '@/api/attachments'
import { INTAKE_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** The numbers to text receipts to, and the phone this customer's texts are matched on. */
export function useIntake() {
  const { token } = useAuth()
  return useQuery({
    queryKey: INTAKE_KEY,
    queryFn: () => fetchIntake(token!),
    enabled: !!token,
    staleTime: 60_000,
  })
}
