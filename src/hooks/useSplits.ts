import { useMutation } from '@tanstack/react-query'
import { renameTaxLine, saveSplits, type SplitInput } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Save a transaction's hand-made splits (the whole set). */
export function useSaveSplits() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, splits }: { id: number; splits: SplitInput[] }) => saveSplits(token!, id, splits),
    onSettled: invalidate,
  })
}

/** Rename one tax line. */
export function useRenameTaxLine() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, agencyId, name }: { id: number; agencyId: number; name: string | null }) =>
      renameTaxLine(token!, id, agencyId, name),
    onSettled: invalidate,
  })
}
