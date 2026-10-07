import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AccountPage } from '@/components/Account/AccountPage'
import { LoginPage } from '@/components/Auth/LoginPage'
import { SignupPage } from '@/components/Auth/SignupPage'
import { BookkeepingPage } from '@/components/Bookkeeping/BookkeepingPage'
import { DashboardHome } from '@/components/Dashboard/DashboardHome'
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout'
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
    children: [
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'bookkeeping', element: <BookkeepingPage /> },
          { path: 'account', element: <AccountPage /> },
        ],
      },
    ],
  },
  // The account page moved into the dashboard; keep old links working.
  { path: '/account', element: <Navigate to="/dashboard/account" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
