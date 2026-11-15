/**
 * step2 (2026-11-15): a COPY of the server's `descriptionKey` (name-memory.util.ts) — the
 * Names tab groups a name's rows by it, so a description clicked there opens exactly those
 * rows: lower-cased, accents stripped, digits / punctuation removed, one-letter words dropped.
 */
export function descriptionKey(description: string | null | undefined): string {
  return (description ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1)
    .join(' ')
    .slice(0, 191)
    .trim()
}
