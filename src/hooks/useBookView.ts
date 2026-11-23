import { useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

/** step11 (2026-11-23): the tabs of a book page — each one is its own URL. */
export const BOOK_VIEWS = [
  'statements',
  'ledger',
  'communications',
  'accounts',
  'income',
  'balance',
  'names',
  'products',
  'schedules',
] as const

export type BookView = (typeof BOOK_VIEWS)[number]

export function isBookView(v: string | null | undefined): v is BookView {
  return BOOK_VIEWS.includes(v as BookView)
}

/**
 * step11 (2026-11-23, user's request): the open tab of a book page lives in the URL, so a
 * refresh (or a shared link) opens the same tab. At `/dashboard/bookkeeping/<view>` it is the
 * path; embedded in a business page (`/dashboard/businesses/:id`) it is `?view=`. `extra`
 * search params are set (a string) or removed (null) in the same navigation; every other
 * param — `?book=` included — is kept.
 */
export function useBookView(embedded: boolean): {
  view: BookView
  setView: (view: BookView, extra?: Record<string, string | null>) => void
} {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const raw = embedded ? search.get('view') : params.view
  const view: BookView = isBookView(raw) ? raw : 'statements'

  const setView = useCallback(
    (next: BookView, extra: Record<string, string | null> = {}) => {
      const query = new URLSearchParams(search)
      for (const [k, v] of Object.entries(extra)) {
        if (v === null) query.delete(k)
        else query.set(k, v)
      }
      if (embedded) {
        query.set('view', next)
        setSearch(query)
        return
      }
      const qs = query.toString()
      navigate(`/dashboard/bookkeeping/${next}${qs ? `?${qs}` : ''}`)
    },
    [embedded, navigate, search, setSearch],
  )
  return { view, setView }
}

/**
 * step11 (2026-11-23): a tab's own filter kept in the URL (`?filter=`), so a refresh keeps it.
 * The fallback is never written (a clean URL); `allowed` rejects a value the tab does not know.
 */
export function useSearchState<T extends string>(
  key: string,
  fallback: T,
  allowed?: (v: string) => v is T,
): [T, (v: T) => void] {
  const [search, setSearch] = useSearchParams()
  const raw = search.get(key)
  const value = raw !== null && (!allowed || allowed(raw)) ? (raw as T) : fallback
  const set = useCallback(
    (v: T) =>
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (v === fallback) next.delete(key)
          else next.set(key, v)
          return next
        },
        { replace: true },
      ),
    [fallback, key, setSearch],
  )
  return [value, set]
}
