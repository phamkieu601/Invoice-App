import { create } from 'zustand'

export const COMPANY_DEFAULTS = {
  companyName:    'TDI APJ VIETNAM CO., LTD',
  taxCode:        '0300000001',
  address:        '1 Vo Van Tan St., Vo Thi Sau Ward, District 3, Ho Chi Minh City',
  phone:          '028-1234-5678',
  email:          'invoice@tdiapj.vn',
  website:        'www.tdiapj.vn',
  bankName:       'Vietcombank — CN TP. Hồ Chí Minh',
  bankAccount:    '0001232184569',
  bankBranch:     'Chi nhánh TP. Hồ Chí Minh',
  legalRep:       'Nguyễn Văn A',
  legalRepTitle:  'Tổng Giám đốc',
}

const STORAGE_KEY = 'companySettings'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...COMPANY_DEFAULTS, ...JSON.parse(raw) } : COMPANY_DEFAULTS
  } catch { return COMPANY_DEFAULTS }
}

function persist(data) {
  const { update: _u, reset: _r, ...fields } = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
}

export const useCompanyStore = create((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch)
    persist({ ...get(), ...patch })
  },
  reset: () => {
    set(COMPANY_DEFAULTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPANY_DEFAULTS))
  },
}))

// Plain getter for non-React contexts (mockData, invoiceService)
export function getCompany() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...COMPANY_DEFAULTS, ...JSON.parse(raw) } : COMPANY_DEFAULTS
  } catch { return COMPANY_DEFAULTS }
}
