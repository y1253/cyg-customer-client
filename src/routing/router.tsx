import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AccountPage } from '@/components/Account/AccountPage'
import { LoginPage } from '@/components/Auth/LoginPage'
import { SignupPage } from '@/components/Auth/SignupPage'
import { HomePage } from '@/components/Home/HomePage'
import { CustomerRoute, GuestRoute } from './CustomerRoute'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <CustomerRoute />,
    children: [{ path: '/account', element: <AccountPage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
