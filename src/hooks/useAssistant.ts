import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ASSISTANT_CONFIG_KEY,
  ASSISTANT_RULES_KEY,
  ATTACHMENT_CHAT_KEY,
  ATTACHMENT_MESSAGES_KEY,
  CONVERSATION_KEY,
  CONVERSATIONS_KEY,
  deleteAssistantRule,
  fetchAssistantConfig,
  fetchAssistantRules,
  fetchAttachmentChat,
  fetchAttachmentMessages,
  fetchConversationMessages,
  fetchConversations,
  sendAssistantMessage,
  sendAttachmentChat,
  type AssistantReply,
} from '@/api/assistant'
import { useAuth } from '@/context/AuthContext'
import { changedSomething } from '@/lib/assistant'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Whether the AI assistant is on for this firm. Off (or unknown) = every AI control hides. */
export function useAssistantConfig() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ASSISTANT_CONFIG_KEY,
    queryFn: () => fetchAssistantConfig(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** True only once the server said the assistant is on. */
export function useAssistantEnabled(): boolean {
  return useAssistantConfig().data?.enabled === true
}

/** After an answer: the threads list always; the books too when the AI changed something. */
function useAfterReply() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return (r: AssistantReply) => {
    void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
    void queryClient.invalidateQueries({ queryKey: ASSISTANT_RULES_KEY })
    void queryClient.invalidateQueries({ queryKey: ATTACHMENT_MESSAGES_KEY })
    if (changedSomething(r.reply)) void invalidate()
  }
}

/** This book's conversations, every channel (website, text, WhatsApp), newest first. */
export function useConversations({ enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(CONVERSATIONS_KEY),
    queryFn: () => fetchConversations(book.auth),
    enabled: !!book.token && enabled,
  })
}

export function useConversationMessages(id: number | null) {
  const book = useBook()
  return useQuery({
    queryKey: book.key([...CONVERSATION_KEY, id]),
    queryFn: () => fetchConversationMessages(book.auth, id!),
    enabled: !!book.token && id !== null,
  })
}

export function useSendAssistantMessage() {
  const book = useBook()
  const queryClient = useQueryClient()
  const after = useAfterReply()
  return useMutation({
    mutationFn: (body: { conversationId?: number; text: string; attachmentIds?: number[] }) =>
      sendAssistantMessage(book.auth, body),
    onSuccess: (r) => {
      queryClient.setQueryData(book.key([...CONVERSATION_KEY, r.conversationId]), (old: unknown) => [
        ...((old as AssistantReply['message'][] | undefined) ?? []),
        r.message,
        r.reply,
      ])
      after(r)
    },
  })
}

/** The "Ask AI" thread about one attachment. */
export function useAttachmentChat(attachmentId: number, { enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key([...ATTACHMENT_CHAT_KEY, attachmentId]),
    queryFn: () => fetchAttachmentChat(book.auth, attachmentId),
    enabled: !!book.token && enabled,
  })
}

export function useSendAttachmentChat(attachmentId: number) {
  const book = useBook()
  const queryClient = useQueryClient()
  const after = useAfterReply()
  return useMutation({
    mutationFn: (text: string) => sendAttachmentChat(book.auth, attachmentId, text),
    onSuccess: (r) => {
      queryClient.setQueryData(book.key([...ATTACHMENT_CHAT_KEY, attachmentId]), (old: unknown) => {
        const prev = old as { messages: AssistantReply['message'][] } | undefined
        return { conversationId: r.conversationId, messages: [...(prev?.messages ?? []), r.message, r.reply] }
      })
      after(r)
    },
  })
}

/** What the AI learned about this book (the customer's private rules). */
export function useAssistantRules({ enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(ASSISTANT_RULES_KEY),
    queryFn: () => fetchAssistantRules(book.auth),
    enabled: !!book.token && enabled,
  })
}

export function useDeleteAssistantRule() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAssistantRule(book.auth, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ASSISTANT_RULES_KEY }),
  })
}

/** step11b: every AI message linked to one file, any channel — shown on that file's row. */
export function useAttachmentMessages(attachmentId: number, { enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key([...ATTACHMENT_MESSAGES_KEY, attachmentId]),
    queryFn: () => fetchAttachmentMessages(book.auth, attachmentId),
    enabled: !!book.token && enabled,
  })
}
