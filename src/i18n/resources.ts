// Every translation file, bundled into the app (no loading flash). One namespace per
// area of the site; English and French must hold the same keys (scripts/check-i18n.mjs).
import enCommon from './locales/en/common.json'
import enSite from './locales/en/site.json'
import enLegal from './locales/en/legal.json'
import enAuth from './locales/en/auth.json'
import enDashboard from './locales/en/dashboard.json'
import enRegister from './locales/en/register.json'
import enPortal from './locales/en/portal.json'
import enAssistant from './locales/en/assistant.json'
import enBooks from './locales/en/books.json'
import enLedger from './locales/en/ledger.json'
import enNames from './locales/en/names.json'
import frCommon from './locales/fr/common.json'
import frSite from './locales/fr/site.json'
import frLegal from './locales/fr/legal.json'
import frAuth from './locales/fr/auth.json'
import frDashboard from './locales/fr/dashboard.json'
import frRegister from './locales/fr/register.json'
import frPortal from './locales/fr/portal.json'
import frAssistant from './locales/fr/assistant.json'
import frBooks from './locales/fr/books.json'
import frLedger from './locales/fr/ledger.json'
import frNames from './locales/fr/names.json'

export const en = {
  common: enCommon,
  site: enSite,
  legal: enLegal,
  auth: enAuth,
  dashboard: enDashboard,
  register: enRegister,
  portal: enPortal,
  assistant: enAssistant,
  books: enBooks,
  ledger: enLedger,
  names: enNames,
}

export const fr: Record<keyof typeof en, object> = {
  common: frCommon,
  site: frSite,
  legal: frLegal,
  auth: frAuth,
  dashboard: frDashboard,
  register: frRegister,
  portal: frPortal,
  assistant: frAssistant,
  books: frBooks,
  ledger: frLedger,
  names: frNames,
}
