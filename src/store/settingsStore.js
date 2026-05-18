import { create } from 'zustand'

const DEFAULTS = {
  timezone: 'Asia/Ho_Chi_Minh',
  dateFormat: 'DD/MM/YYYY',
  currencyFormat: 'vi-VN',
  currencySymbol: '₫',
  currencyPosition: 'after',  // 'before' | 'after'
  numberSeparator: 'vi',      // 'vi' (1.000,00) | 'en' (1,000.00)
  decimalPlaces: 0,           // 0 | 2
}

function load() {
  try {
    const raw = localStorage.getItem('appSettings')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch { return DEFAULTS }
}

function save(state) {
  const { set: _set, ...data } = state
  localStorage.setItem('appSettings', JSON.stringify(data))
}

export const useSettingsStore = create((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch)
    save({ ...get(), ...patch })
  },
  reset: () => {
    set(DEFAULTS)
    localStorage.setItem('appSettings', JSON.stringify(DEFAULTS))
  },
}))
