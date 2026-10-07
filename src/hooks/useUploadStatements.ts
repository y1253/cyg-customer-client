import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { STATEMENTS_KEY, UPLOAD_BATCH, uploadStatements } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/**
 * Uploads any number of PDFs, `UPLOAD_BATCH` per request, and reports overall progress
 * (0..1) across all batches.
 */
export function useUploadStatements() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)
  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      setProgress(0)
      const total = files.reduce((s, f) => s + f.size, 0) || 1
      let done = 0
      for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
        const batch = files.slice(i, i + UPLOAD_BATCH)
        const size = batch.reduce((s, f) => s + f.size, 0)
        await uploadStatements(token!, batch, (f) => setProgress((done + f * size) / total))
        done += size
        // Show each batch as it lands rather than after the whole upload.
        void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      }
      setProgress(1)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY }),
  })
  return { ...mutation, progress }
}
