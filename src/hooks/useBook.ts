import { bookKey, type BookAuth } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useBookScope } from '@/context/BookScopeContext'

/**
 * What a bookkeeping hook needs: the token (for `enabled`), the open book, the `auth` every
 * bookkeeping API call takes, and `key()` to scope a query key to that book.
 */
export function useBook() {
  const { token } = useAuth()
  const companyId = useBookScope()
  const auth: BookAuth = { token: token ?? '', companyId }
  return {
    token,
    companyId,
    auth,
    key: <K extends readonly unknown[]>(k: K) => bookKey(k, companyId),
  }
}
