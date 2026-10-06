export interface Health {
  status: 'ok'
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error(`API answered ${res.status}`)
  return res.json() as Promise<Health>
}
