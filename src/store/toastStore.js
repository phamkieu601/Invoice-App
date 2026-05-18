import { create } from 'zustand'

let nextId = 1

export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'success', duration = 3500) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Convenience helpers — use outside React components too
export const toast = {
  success: (msg, dur) => useToastStore.getState().add(msg, 'success', dur),
  error:   (msg, dur) => useToastStore.getState().add(msg, 'error',   dur),
  info:    (msg, dur) => useToastStore.getState().add(msg, 'info',    dur),
  warning: (msg, dur) => useToastStore.getState().add(msg, 'warning', dur),
}
