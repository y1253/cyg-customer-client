import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AccountPage } from '@/components/Account/AccountPage'
import { AssistantPage } from '@/components/Assistant/AssistantPage'
import { ForgotPasswordPage } from '@/components/Auth/ForgotPasswordPage'
import { LoginPage } from '@/components/Auth/LoginPage'
import { SignupPage } from '@/components/Auth/SignupPage'
import { BookkeepingRoute } from '@/components/Bookkeeping/BookkeepingRoute'
import { ContactsPage } from '@/components/Contacts/ContactsPage'
import { PlaidOAuthPage } from '@/components/Bookkeeping/PlaidOAuthPage'
import { ConnectResultPage } from '@/components/Connect/ConnectResultPage'
import { DashboardHome } from '@/components/Dashboard/DashboardHome'
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout'
import { HomePage } from '@/components/Home/HomePage'
import { PrivacyPage } from '@/components/Legal/PrivacyPage'
import { SecurityPolicyPage } from '@/components/Legal/SecurityPolicyPage'
import { CompanyPortalPage } from '@/components/Portal/CompanyPortalPage'
import { RegistrationsPage } from '@/components/Register/RegistrationsPage'
import { RegisterWizardPage } from '@/components/Register/RegisterWizard'
import { RequestsPage } from '@/components/Requests/RequestsPage'
import { CustomerRoute, GuestRoute } from './CustomerRoute'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/security-policy', element: <SecurityPolicyPage /> },
  // Where the internal API's Gmail / Outlook OAuth callback sends the registration
  // wizard's popup. Outside the guards: it only posts a message to its opener and closes.
  { path: '/connect/:provider/:result', element: <ConnectResultPage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <CustomerRoute />,
    children: [
      // A bank that signs in on its own site (OAuth) returns here to finish Plaid Link.
      { path: '/plaid/oauth', element: <PlaidOAuthPage /> },
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'bookkeeping', element: <BookkeepingRoute /> },
          { path: 'contacts', element: <ContactsPage /> },
          { path: 'requests', element: <RequestsPage /> },
          { path: 'account', element: <AccountPage /> },
          { path: 'assistant', element: <AssistantPage /> },
          { path: 'register', element: <RegistrationsPage /> },
          { path: 'register/:id', element: <RegisterWizardPage /> },
          { path: 'businesses/:id', element: <CompanyPortalPage /> },
        ],
      },
    ],
  },
  // The account page moved into the dashboard; keep old links working.
  { path: '/account', element: <Navigate to="/dashboard/account" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
