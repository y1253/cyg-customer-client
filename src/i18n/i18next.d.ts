import 'i18next'
import type { en } from './resources'

// Typed keys: t('site:hero.title') is checked against the English files at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof en
  }
}
