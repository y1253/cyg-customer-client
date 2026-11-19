import { errorFrom } from './client'
import { bookFetch, type BookAuth } from './bookkeeping'
import type { CustomColumnType } from '@/lib/custom-columns'

/** step8 (2026-11-11): one of the customer's own ledger columns in this book. */
export interface CustomColumn {
  id: number
  name: string
  type: CustomColumnType
  minChars: number | null
  maxChars: number | null
  required: boolean
  options: Array<{ id: number; label: string }>
}

export interface CustomAnswer {
  value: string | null
  dropDownId: number | null
}

/**
 * step9 (2026-11-19): a name's (`name`) or sub-name's (`subNameId`) DEFAULT answer in a column — it fills every
 * empty cell of its rows, now and as rows come in.
 */
export interface CustomNameAnswer extends CustomAnswer {
  columnId: number
  name: string | null
  subNameId: number | null
}

/** Who a default answer is for. */
export type NameAnswerTarget = { name: string; subNameId?: undefined } | { subNameId: number; name?: undefined }

export interface CustomColumnsData {
  columns: CustomColumn[]
  /** transactionId → columnId → answer. */
  answers: Record<number, Record<number, CustomAnswer>>
  /** step9 (2026-11-19): the names' / sub-names' default answers. */
  nameAnswers: CustomNameAnswer[]
  /** The customer's other companies with columns — "same as …". */
  templates: Array<{
    bookId: number
    bookName: string
    columns: Array<{ name: string; type: CustomColumnType; options: number }>
  }>
}

export interface CustomColumnInput {
  name: string
  type: CustomColumnType
  minChars: number | null
  maxChars: number | null
  required: boolean
  options: Array<{ id?: number; label: string }>
}

export const CUSTOM_COLUMNS_KEY = ['bookkeeping', 'custom-columns'] as const

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

async function call(auth: BookAuth, url: string, init?: RequestInit): Promise<CustomColumnsData> {
  const res = await bookFetch(auth, url, init)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export const fetchCustomColumns = (auth: BookAuth) => call(auth, '/api/bookkeeping/custom-columns')

export const saveCustomColumn = (auth: BookAuth, values: CustomColumnInput & { id?: number }) =>
  call(
    auth,
    values.id ? `/api/bookkeeping/custom-columns/${values.id}` : '/api/bookkeeping/custom-columns',
    json(values.id ? 'PATCH' : 'POST', { ...values, id: undefined }),
  )

export const deleteCustomColumn = (auth: BookAuth, id: number) =>
  call(auth, `/api/bookkeeping/custom-columns/${id}`, { method: 'DELETE' })

export const copyCustomColumns = (auth: BookAuth, fromBookId: number) =>
  call(auth, '/api/bookkeeping/custom-columns/copy', json('POST', { fromBookId }))

/** step9 (2026-11-19): a name's / sub-name's default answer (empty = removed); it fills their empty cells. */
export const saveNameAnswer = (
  auth: BookAuth,
  values: NameAnswerTarget & { columnId: number; value?: string | null; dropDownId?: number | null },
) =>
  call(
    auth,
    `/api/bookkeeping/custom-columns/${values.columnId}/names`,
    json('PUT', {
      name: values.name,
      subNameId: values.subNameId,
      value: values.value ?? null,
      dropDownId: values.dropDownId ?? null,
    }),
  )

export const saveCustomAnswer = (
  auth: BookAuth,
  values: { transactionId: number; columnId: number; value?: string | null; dropDownId?: number | null },
) =>
  call(
    auth,
    `/api/bookkeeping/transactions/${values.transactionId}/custom/${values.columnId}`,
    json('PUT', { value: values.value ?? null, dropDownId: values.dropDownId ?? null }),
  )
