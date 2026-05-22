import { getCompany } from '../../store/companyStore'

export const INVOICE_TEMPLATES = [
  {
    code: '02GTTT0/001',
    name: 'Hóa đơn bán hàng',
    nameVi: 'Hóa đơn bán hàng (02/GTTT)',
    series: '2C24ABO',
    type: 'GTTT',
  },
]

export function getSeller() {
  const c = getCompany()
  return {
    name:          c.companyName,
    taxCode:       c.taxCode,
    address:       c.address,
    bankAccount:   c.bankAccount,
    bankName:      `${c.bankName}${c.bankBranch ? ' — ' + c.bankBranch : ''}`,
    phone:         c.phone,
    email:         c.email,
    website:       c.website,
    symbol:        '1C24ABO',
    legalRep:      c.legalRep,
    legalRepTitle: c.legalRepTitle,
  }
}

export const mockInvoices = [
  {
    id: 'INV-2024-001',
    sapBillingDoc: '9000000001',
    status: 'issued',
    issueDate: '2024-05-01',
    dueDate: '2024-05-31',
    taxAuthorityCode: '202400000001AB3F',
    templateCode: '01GTKT0/001',
    buyerName: 'James Anderson',
    billTo: 'ABC Technology Co., Ltd',
    billToCode: 'C001',
    paymentMethod: 'Bank Transfer / Cash',
    currency: 'VND',
    customer: {
      code: 'C001',
      name: 'ABC Technology Co., Ltd',
      taxCode: '0123456789',
      address: '123 Nguyen Hue Blvd, Ben Nghe Ward, District 1, Ho Chi Minh City',
      phone: '028-3822-1111',
      email: 'accounting@abctech.com',
      bankAccount: '',
      bankName: '',
    },
    items: [
      { id: 1, description: 'ERP Software – MM Module License', unit: 'License', qty: 1, unitPrice: 50000000, vatRate: 10 },
      { id: 2, description: 'Implementation Consulting Service', unit: 'Day', qty: 5, unitPrice: 8000000, vatRate: 10 },
    ],
    note: 'Payment via bank transfer',
    series: '1C24ABO',
    number: '00000001',
  },
  {
    id: 'INV-2024-002',
    sapBillingDoc: '9000000002',
    status: 'draft',
    issueDate: '2024-05-10',
    dueDate: '2024-06-10',
    buyerName: 'Sarah Mitchell',
    paymentMethod: 'Bank Transfer',
    currency: 'VND',
    customer: {
      code: 'C002',
      name: 'XYZ Group Corporation',
      taxCode: '9876543210',
      address: '456 Le Loi St., Ben Thanh Ward, District 1, Ho Chi Minh City',
      phone: '028-3911-2222',
      email: 'finance@xyzgroup.com',
      bankAccount: '1234567890',
      bankName: 'Vietcombank',
    },
    items: [
      { id: 1, description: 'Accounting Software License', unit: 'Year', qty: 2, unitPrice: 30000000, vatRate: 10 },
    ],
    note: '',
    series: '1C24ABO',
    number: '00000002',
  },
  {
    id: 'INV-2024-003',
    sapBillingDoc: '9000000003',
    status: 'cancelled',
    issueDate: '2024-04-15',
    dueDate: '2024-05-15',
    buyerName: 'Michael Chen',
    paymentMethod: 'Cash',
    currency: 'VND',
    customer: {
      code: 'C003',
      name: 'DEF Solutions JSC',
      taxCode: '1122334455',
      address: '789 Hai Ba Trung St., Ward 8, District 3, Ho Chi Minh City',
      phone: '028-3930-3333',
      email: 'finance@defsolutions.vn',
      bankAccount: '',
      bankName: '',
    },
    items: [
      { id: 1, description: 'System Maintenance Service', unit: 'Month', qty: 3, unitPrice: 15000000, vatRate: 8 },
    ],
    note: 'Cancelled per customer request',
    series: '1C24ABO',
    number: '00000003',
  },
]

export const calcTotals = (items) => {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0)
  const vat      = items.reduce((sum, it) => sum + it.qty * it.unitPrice * it.vatRate / 100, 0)
  return { subtotal, vat, total: subtotal + vat }
}
