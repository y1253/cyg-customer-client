import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { router } from '@/routing/router'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  // A language switch redraws every page (the router keeps the URL), so text built
  // outside React — money, dates, labels — follows it too.
  const { i18n } = useTranslation()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider key={i18n.resolvedLanguage} router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
