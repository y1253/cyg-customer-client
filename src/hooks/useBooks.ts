import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBook, fetchBooks, renameBook } from '@/api/books'
import { useAuth } from '@/context/AuthContext'

export const BOOKS_KEY = ['books'] as const

/** step12c: the customer's bookkeeping companies (the Bookkeeping switcher). */
export function useBooks() {
  const { token } = useAuth()
  return useQuery({
    queryKey: BOOKS_KEY,
    queryFn: () => fetchBooks(token!),
    enabled: !!token,
  })
}

export function useCreateBook() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createBook(token!, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOKS_KEY }),
  })
}

export function useRenameBook() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameBook(token!, id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOKS_KEY }),
  })
}
