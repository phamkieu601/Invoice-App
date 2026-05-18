import { create } from 'zustand'

const SUPPORTED = ['en', 'vi'] // keep in sync with LANGUAGES in i18n/index.js
const saved = localStorage.getItem('lang')
const initial = SUPPORTED.includes(saved) ? saved : 'en'

export const useLanguageStore = create((set) => ({
  lang: initial,
  setLang: (code) => {
    localStorage.setItem('lang', code)
    set({ lang: code })
  },
}))
