import { useEffect, useSyncExternalStore } from 'react'
import { useBookScope, type BookScope } from '@/context/BookScopeContext'

/**
 * step8: which book the floating chat (`FloatingChat`, in the dashboard shell) talks to, and
 * whether it should hide. The shell sits OUTSIDE every `BookScopeProvider`, so a page that
 * opens a book says so with `useFloatingChatBook()`; with none registered the chat uses the
 * customer's default book — the same one `/dashboard/assistant` uses.
 */
export type FloatingChatState = { scope: BookScope | null; hidden: boolean }

let state: FloatingChatState = { scope: null, hidden: false }
const listeners = new Set<() => void>()

function set(next: FloatingChatState) {
  state = next
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export function useFloatingChatState(): FloatingChatState {
  return useSyncExternalStore(subscribe, () => state)
}

/**
 * Called by a page inside a `BookScopeProvider` (the Bookkeeping page): the floating chat
 * talks to that book while the page is open. `hidden` = the page shows a chat of its own
 * (the Assistant tab), so the button would be a second copy of it.
 */
export function useFloatingChatBook({ hidden = false }: { hidden?: boolean } = {}) {
  const { bookId, companyId } = useBookScope()
  useEffect(() => {
    set({ scope: { bookId, companyId }, hidden })
    return () => set({ scope: null, hidden: false })
  }, [bookId, companyId, hidden])
}

/** The event the floating chat listens for; `detail.text` is put in its message box. */
export const OPEN_CHAT_EVENT = 'cyg:open-chat'
