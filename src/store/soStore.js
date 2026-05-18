import { create } from 'zustand'
import { getSalesOrders, getSalesOrderByNumber, markSOInvoiced } from '../services/soService'

export const useSOStore = create((set, get) => ({
  salesOrders: [],
  currentSO: null,
  loading: false,
  error: null,

  fetchSalesOrders: async (filters) => {
    set({ loading: true, error: null })
    try {
      const salesOrders = await getSalesOrders(filters)
      set({ salesOrders, loading: false })
    } catch (e) {
      set({ salesOrders: [], error: e.message, loading: false })
    }
  },

  fetchSOByNumber: async (soNumber) => {
    set({ loading: true, currentSO: null })
    try {
      const so = await getSalesOrderByNumber(soNumber)
      set({ currentSO: so, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  setSalesOrders: (salesOrders) => set({ salesOrders, loading: false, error: null }),

  markInvoiced: async (soNumber, billingDoc) => {
    const so = await markSOInvoiced(soNumber, billingDoc)
    set(s => ({
      salesOrders: s.salesOrders.map(item => item.soNumber === soNumber ? so : item),
      currentSO: s.currentSO?.soNumber === soNumber ? so : s.currentSO,
    }))
  },
}))
