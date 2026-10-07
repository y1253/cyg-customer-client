import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/** Pages that need a signed-in customer; everyone else goes to /login. */
export function CustomerRoute() {
  const { token } = useAuth()
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

/** Login and signup: a signed-in customer goes straight to their account. */
export function GuestRoute() {
  const { token } = useAuth()
  return token ? <Navigate to="/account" replace /> : <Outlet />
}
