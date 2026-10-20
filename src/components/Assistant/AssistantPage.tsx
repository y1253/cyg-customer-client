import { Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { useAssistantConfig } from '@/hooks/useAssistant'
import { AssistantPanel } from './AssistantPanel'

/** `/dashboard/assistant` — the AI assistant on the customer's general book. */
export function AssistantPage() {
  const config = useAssistantConfig()
  if (config.isLoading) return null
  if (!config.data?.enabled) return <Navigate to="/dashboard" replace />
  return (
    <>
      <PageHeader
        title="AI assistant"
        description="Ask about your books or ask for a change — it answers from your statements and receipts."
      />
      <AssistantPanel />
    </>
  )
}
