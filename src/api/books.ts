import { errorFrom, fetchWithAuth } from './client'

/** step12c: one of the customer's bookkeeping companies (a "book"). */
export type Book = { id: number; name: string; homeCurrency: string }

const BASE = '/api/bookkeeping/books'

/** The customer's companies; the first ("Company1") is created on first look. */
export async function fetchBooks(token: string): Promise<Book[]> {
  const res = await fetchWithAuth(token, BASE)
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<Book[]>
}

export async function createBook(token: string, name: string): Promise<Book> {
  const res = await fetchWithAuth(token, BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<Book>
}

export async function renameBook(token: string, id: number, name: string): Promise<Book> {
  const res = await fetchWithAuth(token, `${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<Book>
}
