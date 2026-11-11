import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  copyCustomColumns,
  CUSTOM_COLUMNS_KEY,
  deleteCustomColumn,
  fetchCustomColumns,
  saveCustomAnswer,
  saveCustomColumn,
  type CustomColumnInput,
  type CustomColumnsData,
} from '@/api/customColumns'
import { useBook } from './useBook'

/** step8: this book's own ledger columns and every answer in them. */
export function useCustomColumns() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(CUSTOM_COLUMNS_KEY),
    queryFn: () => fetchCustomColumns(book.auth),
  })
}

/** Every write answers the whole view: put it straight into the cache. */
function useWrite<V>(fn: (auth: ReturnType<typeof useBook>['auth'], v: V) => Promise<CustomColumnsData>) {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: V) => fn(book.auth, v),
    onSuccess: (data) => queryClient.setQueryData(book.key(CUSTOM_COLUMNS_KEY), data),
  })
}

export const useSaveCustomColumn = () =>
  useWrite((auth, v: CustomColumnInput & { id?: number }) => saveCustomColumn(auth, v))
export const useDeleteCustomColumn = () => useWrite((auth, id: number) => deleteCustomColumn(auth, id))
export const useCopyCustomColumns = () => useWrite((auth, fromBookId: number) => copyCustomColumns(auth, fromBookId))
export const useSaveCustomAnswer = () =>
  useWrite(
    (auth, v: { transactionId: number; columnId: number; value?: string | null; dropDownId?: number | null }) =>
      saveCustomAnswer(auth, v),
  )
