import { create } from 'zustand'
import { getInvoices, getInvoiceById, createInvoice, issueInvoice, cancelInvoice } from '../services/sap/invoiceService'

export const useInvoiceStore = create((set, get) => ({
  invoices: [],
  current: null,
  loading: false,
  error: null,

  fetchInvoices: async (filters) => {
    set({ loading: true, error: null })
    try {
      const invoices = await getInvoices(filters)
      set({ invoices, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  fetchById: async (id) => {
    set({ loading: true, current: null })
    try {
      const inv = await getInvoiceById(id)
      set({ current: inv, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  create: async (data) => {
    set({ loading: true })
    const inv = await createInvoice(data)
    set(s => ({ invoices: [...s.invoices, inv], current: inv, loading: false }))
    return inv
  },

  issue: async (id) => {
    const inv = await issueInvoice(id)
    set(s => ({ invoices: s.invoices.map(i => i.id === id ? inv : i), current: inv }))
  },

  cancel: async (id) => {
    const inv = await cancelInvoice(id)
    set(s => ({ invoices: s.invoices.map(i => i.id === id ? inv : i), current: inv }))
  },
}))
