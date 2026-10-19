import { useMutation } from '@tanstack/react-query'
import { downloadLedger, type ExportFormat } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** Downloads the whole ledger — always every statement combined — as Excel or PDF. */
export function useExportLedger() {
  const book = useBook()
  return useMutation({
    mutationFn: (format: ExportFormat) => downloadLedger(book.auth, format),
  })
}
