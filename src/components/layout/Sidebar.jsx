import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, ShoppingCart, PlusCircle,
  BarChart3, Receipt, ChevronRight, ChevronDown,
  FileBarChart2, FileSpreadsheet, Activity, Truck,
  Palette, Building2, Plug2, Database, Mail, Users, Bell,
} from 'lucide-react'
import { useT } from '../../i18n'

const NavSection = ({ label }) => (
  <div className="px-4 pt-5 pb-1.5 flex items-center gap-2">
    <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{label}</span>
    <div className="flex-1 h-px bg-slate-800" />
  </div>
)

const NavItem = ({ to, icon: Icon, label, badge, sub }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-150 mx-2
      ${sub ? 'px-3 py-1.5' : 'px-3 py-2'}
      ${isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`
    }
  >
    {/* Icon container — larger for top-level, smaller for sub */}
    <span className={`flex items-center justify-center rounded-md shrink-0 transition-colors
      ${sub ? 'w-5 h-5' : 'w-7 h-7'}
      ${sub
        ? 'text-slate-500 group-[.active]:text-blue-300'
        : 'bg-slate-800 group-hover:bg-slate-700'
      }`}
      style={{ fontSize: 0 }}
    >
      <Icon size={sub ? 13 : 15} />
    </span>

    <span className={`flex-1 ${sub ? 'text-xs' : 'text-sm'}`}>{label}</span>

    {badge != null && (
      <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
        {badge}
      </span>
    )}
  </NavLink>
)

function ReportsMenu() {
  const location = useLocation()
  const isReports = location.pathname.startsWith('/reports')
  const [open, setOpen] = useState(isReports)

  return (
    <div>
      {/* Parent toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-150 mx-2 px-3 py-2
          ${isReports
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'}
        `}
        style={{ width: 'calc(100% - 16px)' }}
      >
        <span className={`flex items-center justify-center rounded-md shrink-0 w-7 h-7 transition-colors
          ${isReports ? 'bg-blue-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
          <BarChart3 size={15} />
        </span>
        <span className="flex-1 text-left text-sm">Báo cáo</span>
        {open
          ? <ChevronDown size={13} className="shrink-0 opacity-60" />
          : <ChevronRight size={13} className="shrink-0 opacity-60" />
        }
      </button>

      {/* Sub items */}
      {open && (
        <div className="mt-0.5 ml-5 border-l border-slate-700 pl-2 space-y-0.5">
          {[
            { to: '/reports/invoice', icon: FileBarChart2, label: 'Tổng hợp hóa đơn' },
            { to: '/reports/cqt',     icon: FileSpreadsheet, label: 'Bảng kê gửi CQT' },
          ].map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors
                ${isActive
                  ? 'text-blue-300 bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
              }>
              <item.icon size={12} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsGroup({ label, items, defaultOpen = true }) {
  const location = useLocation()
  const hasActive = items.some(i => location.pathname.startsWith(i.to))
  const [open, setOpen] = useState(defaultOpen || hasActive)

  return (
    <div className="mx-2 mb-0.5">
      {/* Group header button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
      >
        <span className="flex-1 text-left text-[10px] font-bold tracking-widest uppercase">{label}</span>
        {open
          ? <ChevronDown size={11} className="shrink-0 opacity-50" />
          : <ChevronRight size={11} className="shrink-0 opacity-50" />}
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 ml-3 border-l border-slate-700/70 pl-2 space-y-0.5">
          {items.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors
                ${isActive
                  ? 'text-blue-300 bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
              }>
              <item.icon size={12} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 leading-none">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsNav() {
  const t = useT()

  const groups = [
    {
      label: t('settings.group.org'),
      defaultOpen: true,
      items: [
        { to: '/settings/company',        icon: Building2, label: t('settings.nav.company') },
        { to: '/settings/invoice-config', icon: FileText,  label: t('settings.nav.invoiceConfig') },
        { to: '/settings/cqt',            icon: Plug2,     label: t('settings.nav.cqt') },
      ],
    },
    {
      label: t('settings.group.integration'),
      defaultOpen: true,
      items: [
        { to: '/settings/sap', icon: Database, label: 'SAP S/4HANA · Viettel · Email' },
      ],
    },
    {
      label: t('settings.group.admin'),
      defaultOpen: true,
      items: [
        { to: '/settings/users',         icon: Users,   label: t('settings.nav.users') },
        { to: '/settings/notifications', icon: Bell,    label: t('settings.nav.notifications') },
        { to: '/settings/appearance',    icon: Palette, label: t('settings.nav.appearance') },
      ],
    },
  ]

  return (
    <div className="mt-1 space-y-0.5">
      {groups.map(g => (
        <SettingsGroup key={g.label} label={g.label} items={g.items} defaultOpen={g.defaultOpen} />
      ))}
    </div>
  )
}

export default function Sidebar() {
  const t = useT()
  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0 h-screen sticky top-0">

      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Receipt size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight tracking-tight">VietInvoice</div>
            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">E-Invoice System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">

        <NavSection label={t('nav.overview')} />
        <NavItem to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
        <ReportsMenu />

        <NavSection label="SD — Bán hàng & Phân phối" />
        <NavItem to="/sales-orders" icon={ShoppingCart} label={t('nav.salesOrders')} />
        <NavItem to="/deliveries"   icon={Truck}        label={t('nav.deliveryProcessing')} />
        <NavItem to="/invoices"     icon={FileText}     label="Billing Documents" />

        <NavSection label="Hóa đơn điện tử" />
        <NavItem to="/issued-invoices" icon={Receipt}    label="Danh sách hóa đơn" />
        <NavItem to="/create"          icon={PlusCircle} label="Tạo hóa đơn" />
        <NavItem to="/activity-log"    icon={Activity}   label={t('nav.activityLog')} sub />

        <NavSection label={t('nav.system')} />
        <SettingsNav />

      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">Admin ABEO</div>
            <div className="text-[10px] text-slate-500 truncate">admin@abeo.vn</div>
          </div>
          <ChevronRight size={13} className="text-slate-600 shrink-0" />
        </div>
        <div className="text-[10px] text-center text-slate-700 mt-2 font-medium">v2.0.0 · SAP Mock Mode</div>
      </div>

    </aside>
  )
}
