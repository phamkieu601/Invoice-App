import { create } from 'zustand'

const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const initial = saved ? saved === 'dark' : prefersDark

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark)
}

applyTheme(initial)

export const useThemeStore = create((set) => ({
  dark: initial,
  toggle: () => set(s => {
    const next = !s.dark
    applyTheme(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    return { dark: next }
  }),
}))
