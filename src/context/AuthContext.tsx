import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CUSTOMER_KEY, TOKEN_KEY } from '@/api/client'
import type { AuthResult, Customer } from '@/api/customerAuth'

type AuthState = {
  token: string | null
  customer: Customer | null
  /** Store a fresh login/signup result. */
  setSession: (result: AuthResult) => void
  /** Replace the cached profile (after an edit or a `/me` refetch). */
  setCustomer: (customer: Customer) => void
  /** Sessions are stateless JWTs: signing out is forgetting the token. */
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function readCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY)
    return raw ? (JSON.parse(raw) as Customer) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [customer, setCustomerState] = useState<Customer | null>(readCustomer)

  const setCustomer = useCallback((c: Customer) => {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c))
    setCustomerState(c)
  }, [])

  const setSession = useCallback(
    (result: AuthResult) => {
      localStorage.setItem(TOKEN_KEY, result.access_token)
      setToken(result.access_token)
      setCustomer(result.customer)
    },
    [setCustomer],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CUSTOMER_KEY)
    setToken(null)
    setCustomerState(null)
  }, [])

  const value = useMemo(
    () => ({ token, customer, setSession, setCustomer, logout }),
    [token, customer, setSession, setCustomer, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
