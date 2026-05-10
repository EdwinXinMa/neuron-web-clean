import { createI18n } from 'vue-i18n'
import type { App } from 'vue'
import zh from './lang/zh'
import en from './lang/en'
import tw from './lang/tw'
import es from './lang/es'
import pt from './lang/pt'

export type LangType = 'zh' | 'en' | 'tw' | 'es' | 'pt'

const LANG_KEY = 'lang'

export function getStoredLang(): LangType {
  return (localStorage.getItem(LANG_KEY) as LangType) || 'zh'
}

export const i18n = createI18n({
  legacy: false,
  locale: getStoredLang(),
  fallbackLocale: 'zh',
  messages: { zh, en, tw, es, pt },
})

export function setupI18n(app: App) {
  app.use(i18n)
}

export function setLang(lang: LangType) {
  ;(i18n.global.locale as any).value = lang
  localStorage.setItem(LANG_KEY, lang)
  document.documentElement.setAttribute('lang', lang)
}
