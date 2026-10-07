import { useMutation } from '@tanstack/react-query'
import { downloadLedger, type ExportFormat } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** Downloads the whole ledger — always every statement combined — as Excel or PDF. */
export function useExportLedger() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: (format: ExportFormat) => downloadLedger(token!, format),
  })
}
