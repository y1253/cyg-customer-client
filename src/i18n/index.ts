// The site in French and English (Quebec's Charter of the French language). A visitor
// gets their browser's language when it is one of the two, else French; the switch in
// every header saves the choice in localStorage (`cyg.lang`).
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en, fr } from './resources'

export type Lang = 'fr' | 'en'
export const LANG_STORAGE_KEY = 'cyg.lang'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, fr },
    // Unit tests assert the English wording.
    ...(import.meta.env.MODE === 'test' && { lng: 'en' }),
    defaultNS: 'common',
    ns: Object.keys(en),
    supportedLngs: ['fr', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  })

/** 'fr' or 'en' — the language the site is showing now. */
export function currentLang(): Lang {
  return i18n.resolvedLanguage === 'en' ? 'en' : 'fr'
}

/** The Intl locale for dates, numbers and money ('fr-CA' / 'en-CA'). */
export function currentLocale(): string {
  return currentLang() === 'en' ? 'en-CA' : 'fr-CA'
}

export function setLang(lang: Lang) {
  void i18n.changeLanguage(lang)
}

// Keep <html lang>, the title and the description in the shown language.
function syncDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = currentLocale()
  document.title = i18n.t('common:meta.title')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('common:meta.description'))
}
syncDocument()
i18n.on('languageChanged', syncDocument)

export default i18n
