import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import ToastContainer from './components/ui/Toast'
import Dashboard from './pages/Dashboard'
import InvoiceList from './pages/InvoiceList'
import InvoiceCreate from './pages/InvoiceCreate'
import InvoicePreview from './pages/InvoicePreview'
import SOList from './pages/SOList'
import DeliveryList from './pages/DeliveryList'
import IssuedInvoiceList from './pages/IssuedInvoiceList'
import BillingPreview from './pages/BillingPreview'
import ActivityLog from './pages/ActivityLog'
import Reports, { InvoiceReportPage, CQTReportPage } from './pages/Reports'
import Settings, {
  AppearanceSettingsPage, CompanySettingsPage, InvoiceConfigSettingsPage,
  CQTSettingsPage, SAPSettingsPage, EmailSettingsPage,
  UsersSettingsPage, NotificationsSettingsPage,
} from './pages/Settings'

function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        This feature is under development...
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900">
      <ToastContainer />
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales-orders" element={<SOList />} />
          <Route path="/deliveries" element={<DeliveryList />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/issued-invoices" element={<IssuedInvoiceList />} />
          <Route path="/billing-preview/:billingDoc" element={<BillingPreview />} />
          <Route path="/create" element={<InvoiceCreate />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/preview/:id" element={<InvoicePreview />} />
          <Route path="/reports" element={<Navigate to="/reports/invoice" replace />} />
          <Route path="/reports/invoice" element={<InvoiceReportPage />} />
          <Route path="/reports/cqt"     element={<CQTReportPage />} />
          <Route path="/settings" element={<Navigate to="/settings/appearance" replace />} />
          <Route path="/settings/appearance"    element={<AppearanceSettingsPage />} />
          <Route path="/settings/company"       element={<CompanySettingsPage />} />
          <Route path="/settings/invoice-config"element={<InvoiceConfigSettingsPage />} />
          <Route path="/settings/cqt"           element={<CQTSettingsPage />} />
          <Route path="/settings/sap"           element={<SAPSettingsPage />} />
          <Route path="/settings/email"         element={<EmailSettingsPage />} />
          <Route path="/settings/users"         element={<UsersSettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
