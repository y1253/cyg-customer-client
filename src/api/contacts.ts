import { errorFrom, fetchWithAuth } from './client'

/** step12c: someone the AI calls or texts for the customer. */
export type Contact = {
  id: number
  name: string
  /** E.164. */
  phone: string | null
  email: string | null
  note: string | null
  lastContactedAt: string | null
  createdAt: string
}

export type ContactInput = {
  name: string
  phone: string | null
  email: string | null
  note: string | null
}

const BASE = '/api/contacts'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchContacts(token: string): Promise<Contact[]> {
  const res = await fetchWithAuth(token, BASE)
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<Contact[]>
}

export async function createContact(token: string, input: ContactInput): Promise<Contact> {
  const res = await fetchWithAuth(token, BASE, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<Contact>
}

export async function updateContact(token: string, id: number, input: ContactInput): Promise<Contact> {
  const res = await fetchWithAuth(token, `${BASE}/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<Contact>
}

export async function deleteContact(token: string, id: number): Promise<void> {
  const res = await fetchWithAuth(token, `${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}
