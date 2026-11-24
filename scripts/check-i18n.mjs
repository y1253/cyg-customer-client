// Fails the build when the French and English translation files disagree: a key one
// language has and the other lacks, or an empty value. Quebec's Charter of the French
// language — French must never silently fall back to English.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', 'src', 'i18n', 'locales')
const langs = ['fr', 'en']

/** { "a.b": "text" } for every leaf. Plural keys (_one / _other …) count as their base. */
function leaves(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') leaves(v, key, out)
    else out.set(key, v)
  }
  return out
}
const base = (key) => key.replace(/_(zero|one|two|few|many|other)$/, '')

const problems = []
const files = new Set(langs.flatMap((l) => readdirSync(join(root, l)).filter((f) => f.endsWith('.json'))))
for (const file of files) {
  const keys = {}
  for (const lang of langs) {
    let json
    try {
      json = JSON.parse(readFileSync(join(root, lang, file), 'utf8'))
    } catch (e) {
      problems.push(`${lang}/${file}: ${e.message}`)
      continue
    }
    const all = leaves(json)
    for (const [k, v] of all) {
      if (typeof v !== 'string' || !v.trim()) problems.push(`${lang}/${file}: "${k}" is empty`)
    }
    // French plurals have a "many" form (1 000 000 lignes): every _other needs its _many.
    if (lang === 'fr') {
      for (const k of all.keys()) {
        if (k.endsWith('_other') && !all.has(k.replace(/_other$/, '_many'))) {
          problems.push(`fr/${file}: "${k}" needs a "${k.replace(/_other$/, '_many')}" too`)
        }
      }
    }
    keys[lang] = new Set([...all.keys()].map(base))
  }
  if (!keys.fr || !keys.en) continue
  for (const k of keys.en) if (!keys.fr.has(k)) problems.push(`fr/${file}: missing "${k}"`)
  for (const k of keys.fr) if (!keys.en.has(k)) problems.push(`en/${file}: missing "${k}"`)
}

if (problems.length) {
  console.error(`i18n: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`i18n: ${files.size} namespaces, French and English match`)
