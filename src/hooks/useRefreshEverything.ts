import { useQueryClient } from '@tanstack/react-query'
import {
  ASSISTANT_RULES_KEY,
  ATTACHMENT_MESSAGES_KEY,
  CONVERSATION_KEY,
  CONVERSATIONS_KEY,
} from '@/api/assistant'
import { BANK_FEEDS_KEY } from '@/api/bankFeeds'
import { AI_SCHEDULES_KEY, SCHEDULES_KEY } from '@/api/schedules'
import { BOOKS_KEY } from './useBooks'

/**
 * step12h: everything the AI can change, on every page — every book's data (the bare
 * `['bookkeeping']` prefix: statements, ledger, reports, names, products, categories,
 * currency, attachments, communications…), schedules, contacts, books, the profile, bank
 * feeds, feature requests and the AI threads. Refetches only the queries on screen, so it
 * is cheap. Used after every AI answer and when another channel changed something
 * (`useLiveRefresh`).
 */
export function useRefreshEverything() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [
        ['bookkeeping'],
        SCHEDULES_KEY,
        AI_SCHEDULES_KEY,
        ['contacts'],
        BOOKS_KEY,
        ['customer-me'],
        BANK_FEEDS_KEY,
        ['feature-requests'],
        CONVERSATIONS_KEY,
        CONVERSATION_KEY,
        ASSISTANT_RULES_KEY,
        ATTACHMENT_MESSAGES_KEY,
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
}
