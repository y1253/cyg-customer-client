import { createContext, useContext, type ReactNode } from 'react'

/**
 * WHICH set of books the bookkeeping screens below work on. step12c: a book is one of the
 * customer's bookkeeping companies (`bookId`, picked in the switcher on
 * `/dashboard/bookkeeping`) or a registered business's own book (`companyId`, the
 * Bookkeeping tab on "My businesses"). Neither = the customer's default book. Every
 * bookkeeping call sends it (`?bookId=` / `?companyId=`), and every bookkeeping query key
 * carries it, so two books never share a cache entry.
 */
export type BookScope = { bookId: number | null; companyId: number | null }

const BookScopeContext = createContext<BookScope>({ bookId: null, companyId: null })

export function BookScopeProvider({
  bookId = null,
  companyId = null,
  children,
}: {
  bookId?: number | null
  companyId?: number | null
  children: ReactNode
}) {
  return <BookScopeContext.Provider value={{ bookId, companyId }}>{children}</BookScopeContext.Provider>
}

/** The book that is open. */
// eslint-disable-next-line react-refresh/only-export-components
export function useBookScope(): BookScope {
  return useContext(BookScopeContext)
}
