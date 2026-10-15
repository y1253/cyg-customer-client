import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  disconnectMailbox,
  saveRegistrationStep,
  submitRegistration,
  type SubmitBody,
} from '@/api/registrations'
import { useAuth } from '@/context/AuthContext'
import { REGISTRATIONS_KEY } from './useRegistrations'

/** "Next": saves one step. The wizard only moves on once this succeeds. */
export function useSaveRegistrationStep(id: number) {
  const { token } = useAuth()
  return useMutation({
    mutationFn: (v: { key: string; body: Record<string, unknown> }) =>
      saveRegistrationStep(token!, id, v.key, v.body),
  })
}

export function useDisconnectMailbox(id: number) {
  const { token } = useAuth()
  return useMutation({ mutationFn: () => disconnectMailbox(token!, id) })
}

export function useSubmitRegistration(id: number) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitBody) => submitRegistration(token!, id, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY }),
  })
}
