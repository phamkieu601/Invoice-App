import React, { useState, useRef, useEffect } from 'react'
import { Bell, Sun, Moon, ChevronDown } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { useLang } from '../../i18n'

function LangPicker({ lang, current, languages, setLang }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 2 langs → inline pill; 3+ langs → dropdown
  if (languages.length <= 2) {
    return (
      <div className="flex items-center h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 overflow-hidden cursor-pointer select-none">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            title={l.name}
            className={`px-2.5 h-full flex items-center text-[11px] font-bold transition-colors
              ${lang === l.code
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
    )
  }

  // Dropdown for 3+ languages
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-colors cursor-pointer select-none"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{current.label}</span>
        <ChevronDown size={11} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                ${lang === l.code
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.name}</span>
              {lang === l.code && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Topbar({ title, subtitle, actions }) {
  const { dark, toggle: toggleTheme } = useThemeStore()
  const { lang, current, languages, setLang } = useLang()

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        {title && <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        {actions && (
          <>
            {actions}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
          </>
        )}

        {/* Language picker — auto pill or dropdown based on LANGUAGES count */}
        <LangPicker lang={lang} current={current} languages={languages} setLang={setLang} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="relative w-14 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex items-center transition-colors hover:border-slate-300 dark:hover:border-slate-500"
        >
          <span className={`absolute top-1 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 shadow-sm
            ${dark ? 'left-7 bg-slate-600' : 'left-1 bg-white border border-slate-200'}`}>
            {dark
              ? <Moon size={13} className="text-blue-300" />
              : <Sun size={13} className="text-yellow-500" />
            }
          </span>
          <Sun size={11} className={`absolute left-2.5 transition-opacity ${dark ? 'opacity-20 text-slate-400' : 'opacity-0'}`} />
          <Moon size={11} className={`absolute right-2.5 transition-opacity ${dark ? 'opacity-0' : 'opacity-20 text-slate-400'}`} />
        </button>

        {/* Notification */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
          <Bell size={14} className="text-slate-500 dark:text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white dark:ring-slate-800" />
        </button>
      </div>
    </div>
  )
}
