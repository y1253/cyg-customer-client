import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AccountPage } from '@/components/Account/AccountPage'
import { ForgotPasswordPage } from '@/components/Auth/ForgotPasswordPage'
import { LoginPage } from '@/components/Auth/LoginPage'
import { SignupPage } from '@/components/Auth/SignupPage'
import { BookkeepingRoute } from '@/components/Bookkeeping/BookkeepingRoute'
import { ContactsPage } from '@/components/Contacts/ContactsPage'
import { PlaidOAuthPage } from '@/components/Bookkeeping/PlaidOAuthPage'
import { ConnectResultPage } from '@/components/Connect/ConnectResultPage'
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout'
import { HomePage } from '@/components/Home/HomePage'
import { PrivacyPage } from '@/components/Legal/PrivacyPage'
import { SecurityPolicyPage } from '@/components/Legal/SecurityPolicyPage'
import { CompanyPortalPage } from '@/components/Portal/CompanyPortalPage'
import { RegistrationsPage } from '@/components/Register/RegistrationsPage'
import { RegisterWizardPage } from '@/components/Register/RegisterWizard'
import { RequestsPage } from '@/components/Requests/RequestsPage'
import { PhoneUploadPage } from '@/components/Upload/PhoneUploadPage'
import { CustomerRoute, GuestRoute } from './CustomerRoute'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/security-policy', element: <SecurityPolicyPage /> },
  // Where the internal API's Gmail / Outlook OAuth callback sends the registration
  // wizard's popup. Outside the guards: it only posts a message to its opener and closes.
  { path: '/connect/:provider/:result', element: <ConnectResultPage /> },
  // step2 (2026-11-11): the page a phone opens from the QR code — its token is the sign-in.
  { path: '/upload/:token', element: <PhoneUploadPage /> },
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
          // step2 (2026-11-09): the Overview and AI assistant pages are gone — both open
          // Bookkeeping (old links and bookmarks keep working); the AI is the chat bubble.
          { index: true, element: <Navigate to="/dashboard/bookkeeping" replace /> },
          { path: 'bookkeeping', element: <BookkeepingRoute /> },
          { path: 'contacts', element: <ContactsPage /> },
          { path: 'requests', element: <RequestsPage /> },
          { path: 'account', element: <AccountPage /> },
          { path: 'assistant', element: <Navigate to="/dashboard/bookkeeping" replace /> },
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
