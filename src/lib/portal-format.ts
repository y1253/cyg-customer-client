/** "Jane Doe <jane@x.com>" → "Jane Doe"; a bare address stays as it is. */
export function displayName(from: string): string {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from)
  if (!m) return from.trim() || 'Unknown'
  return m[1].trim() || m[2].trim()
}

/** Today → "3:04 PM"; this year → "Oct 3"; older → "Oct 3, 2025". */
export function formatWhen(value: string | number | Date): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  })
}

/** Full date + time, for a message header. */
export function formatFull(value: string | number | Date): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

/** +15145551234 → (514) 555-1234; anything else is shown as it came. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (n.length !== 10) return raw
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
