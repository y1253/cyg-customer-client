import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CARDS_KEY, removeCard } from '@/api/billing'
import { useAuth } from '@/context/AuthContext'

export function useRemoveCard() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeCard(token!, id),
    onSettled: () => qc.invalidateQueries({ queryKey: CARDS_KEY }),
  })
}
