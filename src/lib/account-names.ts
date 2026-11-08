/**
 * step2 (2026-11-08): the name two merged Bank feeds folders get, suggested in the merge
 * dialog (the customer may change it). A folder is named "<bank> <last 4>" (the server's
 * `canonicalAccountName`), so: same bank → "TD 4562 & 5845", two banks → "TD 4562 & BMO 5352".
 * A name already merged ("TD 4562 & 5845") counts as its parts. A name with no account digits
 * gives nothing to combine — `into` is kept.
 */
export function combinedAccountName(into: string, from: string): string {
  const parts = [...accountParts(into) ?? [], ...accountParts(from) ?? []]
  if (!accountParts(into) || !accountParts(from)) return into.trim()
  const banks: Array<{ bank: string; digits: string[] }> = []
  for (const p of parts) {
    const same = banks.find((b) => b.bank.toLowerCase() === p.bank.toLowerCase())
    if (!same) banks.push({ bank: p.bank, digits: [p.digits] })
    else if (!same.digits.includes(p.digits)) same.digits.push(p.digits)
  }
  return banks.map((b) => [b.bank, b.digits.join(' & ')].filter(Boolean).join(' ')).join(' & ')
}

/** "TD 4562 & 5845" → [{TD, 4562}, {TD, 5845}]; null when a part has no account digits. */
function accountParts(name: string): Array<{ bank: string; digits: string }> | null {
  const out: Array<{ bank: string; digits: string }> = []
  for (const raw of name.split('&')) {
    const m = /^(.*?)[\s·•*x#-]*(\d{3,})\s*$/i.exec(raw.trim())
    if (!m) return null
    // A bare "5845" after "TD 4562 &" is the same bank's.
    const bank = m[1].trim() || out.at(-1)?.bank || ''
    out.push({ bank, digits: m[2].slice(-4) })
  }
  return out.length ? out : null
}

/** Accounts the books make up themselves or hold rows in — never renamed (the server's `renameRefusal`). */
const NOT_RENAMABLE = new Set(['uncategorized', 'retained earnings', "owner's loan", 'exchange gain or loss'])

/** step2: may this account get a pencil? Tax agencies are refused by the server with a message. */
export function canRenameAccount(account: { name: string }): boolean {
  return !NOT_RENAMABLE.has(account.name.trim().toLowerCase())
}
