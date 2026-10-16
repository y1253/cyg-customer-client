import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type PortalUnlock = {
  /** The token from the emailed code, or null while the view is locked. */
  unlockToken: string | null
  unlock: (token: string) => void
  lock: () => void
}

const Ctx = createContext<PortalUnlock | null>(null)

/**
 * Holds the portal unlock token IN MEMORY ONLY — never localStorage. Only the emailed
 * code expires (5 min); once it is accepted the view stays open until the customer
 * leaves the business pages, reloads, or logs out, all of which drop this state.
 */
export function PortalUnlockProvider({ children }: { children: ReactNode }) {
  const [unlockToken, setUnlockToken] = useState<string | null>(null)
  const lock = useCallback(() => setUnlockToken(null), [])
  const value = useMemo(
    () => ({ unlockToken, unlock: setUnlockToken, lock }),
    [unlockToken, lock],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortalUnlock(): PortalUnlock {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortalUnlock must be used inside PortalUnlockProvider')
  return ctx
}
