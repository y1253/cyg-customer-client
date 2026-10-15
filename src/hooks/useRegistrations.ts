import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRegistration,
  discardRegistration,
  getRegistration,
  listRegistrations,
} from '@/api/registrations'
import { useAuth } from '@/context/AuthContext'

export const REGISTRATIONS_KEY = ['registrations'] as const
export const registrationKey = (id: number) => ['registrations', id] as const

/** The customer's businesses: applications in progress and submitted ones. */
export function useRegistrations() {
  const { token } = useAuth()
  return useQuery({
    queryKey: REGISTRATIONS_KEY,
    queryFn: () => listRegistrations(token!),
    enabled: !!token,
  })
}

/** One application, with its saved answers (to resume) and the mailbox state. */
export function useRegistration(id: number) {
  const { token } = useAuth()
  return useQuery({
    queryKey: registrationKey(id),
    queryFn: () => getRegistration(token!, id),
    enabled: !!token && Number.isInteger(id),
    // The saved answers seed the form once; a refetch must not overwrite typing.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useCreateRegistration() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => createRegistration(token!),
    onSettled: () => queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY }),
  })
}

export function useDiscardRegistration() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => discardRegistration(token!, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY }),
  })
}
