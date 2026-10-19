import { createContext, useContext, type ReactNode } from 'react'

/**
 * WHICH set of books the bookkeeping screens below work on (step8): the customer's
 * general book (`null`, the default — `/dashboard/bookkeeping`) or one business of theirs
 * (its `Company.id`, the Bookkeeping tab on "My businesses"). Every bookkeeping call sends
 * it as `?companyId=`, and every bookkeeping query key carries it, so two books never
 * share a cache entry.
 */
const BookScopeContext = createContext<number | null>(null)

export function BookScopeProvider({ companyId, children }: { companyId: number | null; children: ReactNode }) {
  return <BookScopeContext.Provider value={companyId}>{children}</BookScopeContext.Provider>
}

/** The business whose books are open, or null for the general book. */
// eslint-disable-next-line react-refresh/only-export-components
export function useBookScope(): number | null {
  return useContext(BookScopeContext)
}
