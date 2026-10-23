import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContact,
  deleteContact,
  fetchContacts,
  updateContact,
  type ContactInput,
} from '@/api/contacts'
import { useAuth } from '@/context/AuthContext'

const KEY = ['contacts'] as const

/** step12c: the people the AI calls / texts for the customer (the Contacts tab). */
export function useContacts() {
  const { token } = useAuth()
  return useQuery({
    queryKey: KEY,
    queryFn: () => fetchContacts(token!),
    enabled: !!token,
  })
}

export function useSaveContact() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ContactInput }) =>
      id ? updateContact(token!, id, input) : createContact(token!, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteContact() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteContact(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
