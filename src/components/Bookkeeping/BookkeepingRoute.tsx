import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { BookScopeProvider } from '@/context/BookScopeContext'
import { useBooks } from '@/hooks/useBooks'
import { BookkeepingPage } from './BookkeepingPage'
import { BookSwitcher } from './BookSwitcher'

/** The company last opened on this device — a convenience only, so every access is guarded. */
const LAST_BOOK_KEY = 'cyg-last-book'

function lastBook(): number | null {
  try {
    const n = Number(localStorage.getItem(LAST_BOOK_KEY))
    return Number.isInteger(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function rememberBook(id: number): void {
  try {
    localStorage.setItem(LAST_BOOK_KEY, String(id))
  } catch {
    // Private mode: the first company opens next time instead.
  }
}

/**
 * step12c: `/dashboard/bookkeeping` — the Bookkeeping page for ONE of the customer's
 * companies: `?book=<id>` (links in our texts and emails), else the one opened last on this
 * device, else the first. Switching companies remounts the page, so nothing of one book's
 * state leaks into another.
 */
export function BookkeepingRoute() {
  const books = useBooks()
  const [params, setParams] = useSearchParams()
  const list = books.data ?? []
  const wanted = Number(params.get('book')) || lastBook()
  const current = list.find((b) => b.id === wanted) ?? list[0] ?? null

  useEffect(() => {
    if (current) rememberBook(current.id)
  }, [current])

  if (books.error) return <p className="text-sm text-destructive">{books.error.message}</p>
  if (!current) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const select = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('book', String(id))
    setParams(next)
  }

  return (
    <BookScopeProvider key={current.id} bookId={current.id}>
      <BookkeepingPage switcher={<BookSwitcher books={list} current={current} onSelect={select} />} />
    </BookScopeProvider>
  )
}
