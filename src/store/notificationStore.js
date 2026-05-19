import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  notifications: [],

  add(notification) {
    const item = {
      id:        Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      read:      false,
      ...notification,
    }
    set(s => ({ notifications: [item, ...s.notifications].slice(0, 50) }))
  },

  markAllRead() {
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }))
  },

  remove(id) {
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }))
  },

  clearAll() {
    set({ notifications: [] })
  },

  get unreadCount() {
    return get().notifications.filter(n => !n.read).length
  },
}))
