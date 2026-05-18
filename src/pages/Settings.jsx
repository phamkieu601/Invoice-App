import React, { useState } from 'react'
import {
  Sun, Moon, Monitor, Check, RotateCcw, Save,
  ChevronRight, Palette, Building2, FileText,
  CreditCard, Hash, Plug2, Mail, Users, Bell, Globe, Database,
  Wifi, WifiOff,
} from 'lucide-react'

import { useThemeStore } from '../store/themeStore'
import { useLanguageStore } from '../store/languageStore'
import { useSettingsStore } from '../store/settingsStore'
import { useCompanyStore } from '../store/companyStore'
import { LANGUAGES, useT } from '../i18n'
import { toast } from '../store/toastStore'
import { testSAPConnection } from '../services/sapClient'
import { testViettelConnection, clearTokenCache, isViettelConfigured } from '../services/viettelService'
import { useSOStore } from '../store/soStore'

// ── shared primitives ─────────────────────────
function Label({ children, required }) {
  return (
    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </div>
  )
}

function Field({ label, required, children, span }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
        bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100
        focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-300 ${className}`}
    />
  )
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`w-full appearance-none border border-slate-200 dark:border-slate-600 rounded-lg
          px-3 py-2 pr-7 text-sm bg-white dark:bg-slate-700
          text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${className}`}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
        value ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'
      }`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        value ? 'translate-x-4.5' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, title, color = 'blue' }) {
  const colors = {
    blue:   'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
    emerald:'text-emerald-600 dark:text-emerald-400',
    amber:  'text-amber-600 dark:text-amber-400',
    rose:   'text-rose-600 dark:text-rose-400',
  }
  return (
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
      <Icon size={15} className={colors[color]} />
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
    </div>
  )
}

function CardBody({ children, className = '' }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  )
}

function SaveBar({ onSave, onReset, saved, saveLabel, savedLabel }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      {onReset && (
        <button onClick={onReset}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300
            border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <RotateCcw size={12} /> Mặc định
        </button>
      )}
      <button onClick={onSave}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white
          bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
        {saved ? <Check size={12} /> : <Save size={12} />}
        {saved ? (savedLabel || 'Đã lưu!') : (saveLabel || 'Lưu')}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: Giao diện
// ══════════════════════════════════════════════
const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam — UTC+7' },
  { value: 'Asia/Bangkok',     label: 'Thái Lan — UTC+7' },
  { value: 'Asia/Singapore',   label: 'Singapore — UTC+8' },
  { value: 'Asia/Tokyo',       label: 'Nhật Bản — UTC+9' },
  { value: 'Asia/Seoul',       label: 'Hàn Quốc — UTC+9' },
  { value: 'Europe/London',    label: 'Anh — UTC+0' },
  { value: 'America/New_York', label: 'Mỹ Đông — UTC-5' },
  { value: 'UTC',              label: 'Universal — UTC' },
]
const DATE_FORMATS = [
  { value: 'DD/MM/YYYY',  label: 'DD/MM/YYYY — 31/12/2024' },
  { value: 'MM/DD/YYYY',  label: 'MM/DD/YYYY — 12/31/2024' },
  { value: 'YYYY-MM-DD',  label: 'YYYY-MM-DD — 2024-12-31' },
  { value: 'DD-MM-YYYY',  label: 'DD-MM-YYYY — 31-12-2024' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY — 31 Dec 2024' },
]
const CURRENCY_FORMATS = [
  { value: 'vi-VN',      label: '1.234.567 ₫ — Việt Nam',     symbol: '₫', position: 'after',  sep: 'vi' },
  { value: 'en-US',      label: '$1,234,567 — US Dollar',      symbol: '$', position: 'before', sep: 'en' },
  { value: 'ja-JP',      label: '¥1,234,567 — Japanese Yen',   symbol: '¥', position: 'before', sep: 'en' },
  { value: 'custom-dot', label: '1,234,567.00 ₫ — Tùy chỉnh', symbol: '₫', position: 'after',  sep: 'en' },
]

function AppearancePage({ t }) {
  const settings = useSettingsStore()
  const { lang, setLang } = useLanguageStore()
  const { dark, toggle } = useThemeStore()
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'system')
  const [saved, setSaved] = useState(false)

  const handleTheme = (m) => {
    setThemeMode(m)
    localStorage.setItem('themeMode', m)
    if (m === 'light') { if (dark) toggle() }
    else if (m === 'dark') { if (!dark) toggle() }
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark !== dark) toggle()
    }
  }

  const handleSave = () => {
    setSaved(true)
    toast.success(t('settings.appearance.saved'))
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings.appearance.title')} subtitle={t('settings.appearance.subtitle')} />

      {/* Language & Format */}
      <Card>
        <CardHeader icon={Globe} title={t('settings.appearance.langFormat')} color="blue" />
        <CardBody>
          <div className="grid grid-cols-3 gap-4">
            {/* UI Language */}
            <Field label={t('settings.appearance.uiLang')}>
              <Select value={lang} onChange={setLang}
                options={LANGUAGES.map(l => ({ value: l.code, label: `${l.flag} ${l.name}` }))}
              />
            </Field>
            {/* Timezone */}
            <Field label={t('settings.appearance.timezone')}>
              <Select value={settings.timezone}
                onChange={v => settings.update({ timezone: v })}
                options={TIMEZONES}
              />
            </Field>
            {/* Date format */}
            <Field label={t('settings.appearance.dateFormat')}>
              <Select value={settings.dateFormat}
                onChange={v => settings.update({ dateFormat: v })}
                options={DATE_FORMATS}
              />
            </Field>
            {/* Currency */}
            <Field label={t('settings.appearance.currency')}>
              <Select value={settings.currencyFormat}
                onChange={v => {
                  const f = CURRENCY_FORMATS.find(c => c.value === v)
                  if (f) settings.update({ currencyFormat: v, currencySymbol: f.symbol, currencyPosition: f.position, numberSeparator: f.sep })
                }}
                options={CURRENCY_FORMATS}
              />
            </Field>
            {/* Decimal places */}
            <Field label={t('settings.appearance.decimal')}>
              <Select value={String(settings.decimalPlaces ?? 0)}
                onChange={v => settings.update({ decimalPlaces: Number(v) })}
                options={[
                  { value: '0', label: t('settings.appearance.dec0') },
                  { value: '2', label: t('settings.appearance.dec2') },
                ]}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader icon={Palette} title={t('settings.appearance.theme')} color="violet" />
        <CardBody>
          <div className="flex gap-3">
            {[
              { key: 'light',  icon: Sun,     label: t('settings.appearance.light') },
              { key: 'dark',   icon: Moon,    label: t('settings.appearance.dark') },
              { key: 'system', icon: Monitor, label: t('settings.appearance.system') },
            ].map(opt => (
              <button key={opt.key} onClick={() => handleTheme(opt.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                  themeMode === opt.key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                }`}>
                <opt.icon size={15} />
                {opt.label}
                {themeMode === opt.key && <Check size={13} className="ml-auto" />}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <SaveBar onSave={handleSave} onReset={settings.reset} saved={saved}
        saveLabel={t('settings.appearance.save')} savedLabel={t('settings.appearance.saved')} />
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: Thông tin công ty
// ══════════════════════════════════════════════
function CompanyPage({ t }) {
  const company = useCompanyStore()
  // local draft so user can edit without live-committing on every keystroke
  const [form, setForm] = useState({ ...company })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    company.update(form)
    toast.success(t('settings.company.save') + ' ✓')
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings.company.title')} subtitle={t('settings.company.subtitle')} />

      <Card>
        <CardHeader icon={Building2} title={t('settings.company.legalInfo')} color="blue" />
        <CardBody>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Field label={t('settings.company.name')} required span={2}>
              <TextInput value={form.companyName} onChange={set('companyName')} />
            </Field>
            <Field label={t('settings.company.taxCode')} required>
              <TextInput value={form.taxCode} onChange={set('taxCode')} placeholder="0000000000" />
            </Field>
            <Field label={t('settings.company.phone')}>
              <TextInput value={form.phone} onChange={set('phone')} placeholder="024 xxxx xxxx" />
            </Field>
            <Field label={t('settings.company.legalRep')}>
              <TextInput value={form.legalRep} onChange={set('legalRep')} />
            </Field>
            <Field label={t('settings.company.repTitle')}>
              <TextInput value={form.legalRepTitle} onChange={set('legalRepTitle')} placeholder="Giám đốc / Tổng Giám đốc" />
            </Field>
            <Field label={t('settings.company.address')} required span={2}>
              <TextInput value={form.address} onChange={set('address')} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" />
            </Field>
            <Field label={t('settings.company.email')}>
              <TextInput value={form.email} onChange={set('email')} placeholder="example@company.com" />
            </Field>
            <Field label={t('settings.company.website')}>
              <TextInput value={form.website} onChange={set('website')} placeholder="www.company.com" />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={CreditCard} title={t('settings.company.bank')} color="emerald" />
        <CardBody>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Field label={t('settings.company.bankName')} span={2}>
              <TextInput value={form.bankName} onChange={set('bankName')} placeholder="Ngân hàng TMCP..." />
            </Field>
            <Field label={t('settings.company.bankAccount')}>
              <TextInput value={form.bankAccount} onChange={set('bankAccount')} placeholder="0000000000000" />
            </Field>
            <Field label={t('settings.company.bankBranch')}>
              <TextInput value={form.bankBranch} onChange={set('bankBranch')} placeholder="Chi nhánh..." />
            </Field>
          </div>
        </CardBody>
      </Card>

      <SaveBar
        onSave={handleSave}
        onReset={() => { company.reset(); setForm({ ...company, ...company }) }}
        saveLabel={t('settings.company.save')}
      />
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: Cấu hình hóa đơn
// ══════════════════════════════════════════════
const INVOICE_TEMPLATES = [
  { value: '02GTTT', label: 'Hóa đơn bán hàng — 02/GTTT', desc: 'Doanh nghiệp nộp thuế theo phương pháp trực tiếp trên doanh thu' },
]
const INVOICE_CFG_DEFAULTS = {
  defaultTemplate: '01GTKT', seriesPrefix: 'C',
  taxRate: '10', defaultPaymentTerm: '30',
  signatureLabel: 'Người ký hóa đơn',
  invoiceNote: 'Đề nghị thanh toán theo thông tin ngân hàng trên hóa đơn.',
  requireApproval: false,
}

function InvoiceConfigPage({ t }) {
  const [form, setForm] = useState(() => {
    try { return { ...INVOICE_CFG_DEFAULTS, ...JSON.parse(localStorage.getItem('invoiceConfig') || '{}') } }
    catch { return INVOICE_CFG_DEFAULTS }
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => {
    localStorage.setItem('invoiceConfig', JSON.stringify(form))
    toast.success(t('settings.invoice.save') + ' ✓')
  }
  const handleReset = () => {
    setForm(INVOICE_CFG_DEFAULTS)
    localStorage.setItem('invoiceConfig', JSON.stringify(INVOICE_CFG_DEFAULTS))
    toast.info('Đã khôi phục cấu hình mặc định.')
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings.invoice.title')} subtitle={t('settings.invoice.subtitle')} />

      <Card>
        <CardHeader icon={FileText} title={t('settings.invoice.defaultTemplate')} color="violet" />
        <CardBody>
          <div className="space-y-2">
            {INVOICE_TEMPLATES.map(tpl => (
              <button key={tpl.value} onClick={() => set('defaultTemplate')(tpl.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  form.defaultTemplate === tpl.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  form.defaultTemplate === tpl.value ? 'border-violet-500 bg-violet-500' : 'border-slate-300 dark:border-slate-500'
                }`}>
                  {form.defaultTemplate === tpl.value && <Check size={8} className="text-white" />}
                </div>
                <div>
                  <div className={`text-sm font-semibold ${form.defaultTemplate === tpl.value ? 'text-violet-700 dark:text-violet-300' : 'text-slate-800 dark:text-slate-100'}`}>
                    {tpl.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{tpl.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Hash} title={t('settings.invoice.numbering')} color="blue" />
        <CardBody>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Field label={t('settings.invoice.seriesPrefix')}>
              <TextInput value={form.seriesPrefix} onChange={set('seriesPrefix')} placeholder="C, K, M..." />
              <p className="text-[11px] text-slate-400 mt-1">Ví dụ: <span className="font-mono">{form.seriesPrefix || 'C'}24001</span></p>
            </Field>
            <Field label={t('settings.invoice.taxRate')}>
              <Select value={form.taxRate} onChange={set('taxRate')}
                options={[
                  { value: '10', label: '10% — Tiêu chuẩn' },
                  { value: '8',  label: '8% — Giảm thuế' },
                  { value: '5',  label: '5% — Hàng thiết yếu' },
                  { value: '0',  label: '0% — Xuất khẩu' },
                ]}
              />
            </Field>
            <Field label={t('settings.invoice.paymentTerm')}>
              <Select value={form.defaultPaymentTerm} onChange={set('defaultPaymentTerm')}
                options={[
                  { value: '0',  label: 'Thanh toán ngay' },
                  { value: '7',  label: '7 ngày' },
                  { value: '15', label: '15 ngày' },
                  { value: '30', label: '30 ngày' },
                  { value: '45', label: '45 ngày' },
                  { value: '60', label: '60 ngày' },
                ]}
              />
            </Field>
            <Field label={t('settings.invoice.signatureLabel')}>
              <TextInput value={form.signatureLabel} onChange={set('signatureLabel')} />
            </Field>
            <Field label={t('settings.invoice.note')} span={2}>
              <textarea value={form.invoiceNote} onChange={e => set('invoiceNote')(e.target.value)} rows={2}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-300 resize-none"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.invoice.requireApproval')}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t('settings.invoice.approvalDesc')}</div>
            </div>
            <Toggle value={form.requireApproval} onChange={set('requireApproval')} />
          </div>
        </CardBody>
      </Card>

      <SaveBar onSave={handleSave} onReset={handleReset} saveLabel={t('settings.invoice.save')} />
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: Kết nối CQT
// ══════════════════════════════════════════════
function CQTPage({ t }) {
  const [connected, setConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [form, setForm] = useState({
    endpoint: 'https://hddt.gdt.gov.vn/services/invoice',
    taxCode: '0123456789',
    username: 'admin@tdiapj.com.vn',
    password: '',
    useSandbox: true,
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const testConnect = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      setConnected(true)
      toast.success('Kết nối CQT thành công · Sandbox mode')
    }, 1800)
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings.cqt.title')} subtitle={t('settings.cqt.subtitle')} />

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        connected
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}>
        {connected ? <Wifi size={16} className="text-emerald-500" /> : <WifiOff size={16} className="text-slate-400" />}
        <div className="flex-1">
          <div className={`text-sm font-semibold ${connected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
            {connected ? t('settings.cqt.connected') : t('settings.cqt.disconnected')}
          </div>
          {connected && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Sandbox · GDT Portal v3.2</div>}
        </div>
        {connected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </div>

      <Card>
        <CardHeader icon={Plug2} title={t('settings.cqt.status')} color="blue" />
        <CardBody>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Field label={t('settings.cqt.endpoint')} span={2}>
              <TextInput value={form.endpoint} onChange={set('endpoint')} />
            </Field>
            <Field label={t('settings.cqt.taxCode')}>
              <TextInput value={form.taxCode} onChange={set('taxCode')} />
            </Field>
            <Field label="Tên đăng nhập">
              <TextInput value={form.username} onChange={set('username')} />
            </Field>
            <Field label="Mật khẩu">
              <input type="password" value={form.password} onChange={e => set('password')(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <div />
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Môi trường Sandbox</div>
              <div className="text-xs text-slate-400 mt-0.5">Kết nối môi trường kiểm thử của CQT, không gửi dữ liệu thật</div>
            </div>
            <Toggle value={form.useSandbox} onChange={set('useSandbox')} />
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={testConnect} disabled={testing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">
              {testing ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang kiểm tra...</>
              ) : (
                <><Wifi size={14} /> {t('settings.cqt.testConnect')}</>
              )}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: SAP S/4HANA
// ══════════════════════════════════════════════
const SAP_DEFAULTS = {
  tenantUrl: import.meta.env.VITE_SAP_BASE_URL  || '',
  username:  import.meta.env.VITE_SAP_USERNAME  || '',
  password:  import.meta.env.VITE_SAP_PASSWORD  || '',
}

function SAPPage() {
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sapConfig') || '{}')
      return {
        tenantUrl: saved.tenantUrl || SAP_DEFAULTS.tenantUrl,
        username:  saved.username  || SAP_DEFAULTS.username,
        password:  saved.password  || SAP_DEFAULTS.password,
      }
    } catch { return SAP_DEFAULTS }
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'fail'
  const [testError, setTestError]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const testConnection = async () => {
    setTesting(true); setTestResult(null); setTestError(null)
    try {
      const result = await testSAPConnection({ tenantUrl: form.tenantUrl, username: form.username, password: form.password })
      const detail = result.count != null ? ` · ${result.count} Sales Order(s)` : ''
      setTestResult('ok')
      toast.success(`Kết nối SAP thành công${detail}`)
    } catch (err) {
      const msg = err?.message || 'Kiểm tra lại Tenant URL và thông tin xác thực.'
      setTestResult('fail')
      setTestError(msg)
      toast.error('Không thể kết nối — ' + msg)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('sapConfig', JSON.stringify(form))
    try {
      await fetch('/api/dev/sap-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantUrl: form.tenantUrl }),
      })
    } catch { /* production — no dev endpoint */ }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    toast.success('Đã lưu cấu hình SAP.')
    useSOStore.getState().fetchSalesOrders({})
  }

  return (
    <div className="grid grid-cols-3 gap-5 items-start">

      {/* ── LEFT: SAP S/4HANA ── */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow shadow-blue-200 dark:shadow-none shrink-0">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">SAP S/4HANA Public Cloud</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Basic Auth · Communication User · OData REST</p>
          </div>
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border ${
          testResult === 'ok'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
            : testResult === 'fail'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'
        }`}>
          {testResult === 'ok'
            ? <Wifi size={16} className="text-emerald-500 shrink-0" />
            : testResult === 'fail'
              ? <WifiOff size={16} className="text-red-500 shrink-0" />
              : <Wifi size={16} className="text-slate-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold ${
              testResult === 'ok' ? 'text-emerald-700 dark:text-emerald-300'
              : testResult === 'fail' ? 'text-red-600 dark:text-red-400'
              : 'text-slate-600 dark:text-slate-300'
            }`}>
              {testResult === 'ok' ? 'Kết nối thành công'
                : testResult === 'fail' ? 'Không thể kết nối'
                : 'Chưa kiểm tra kết nối'}
            </div>
            {testResult === 'fail' && testError && (
              <div className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate">{testError}</div>
            )}
          </div>
          {testResult === 'ok' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
        </div>

        {/* Fields */}
        <Card>
          <CardHeader icon={Globe} title="Thông tin kết nối" color="blue" />
          <CardBody className="space-y-4">
            <Field label="Tenant URL" required>
              <TextInput value={form.tenantUrl} onChange={set('tenantUrl')}
                placeholder="https://my000000-api.s4hana.cloud.sap" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username" required>
                <TextInput value={form.username} onChange={set('username')} placeholder="COMM_USER" />
              </Field>
              <Field label="Password" required>
                <input type="password" value={form.password} onChange={e => set('password')(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                    bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button onClick={testConnection} disabled={testing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
                  hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 shadow-sm cursor-pointer">
                {testing
                  ? <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                  : <Wifi size={14} />}
                Kiểm tra kết nối
              </button>

              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                  bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm cursor-pointer">
                {saving
                  ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : saved ? <Check size={14} /> : <Save size={14} />}
                {saved ? 'Đã lưu!' : 'Lưu cấu hình'}
              </button>
            </div>
          </CardBody>
        </Card>

        {/* Note */}
        <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3.5 py-3 leading-relaxed">
          Sau khi lưu, SO List sẽ tải lại từ SAP. Nếu đổi Tenant URL, cần <span className="font-semibold">khởi động lại dev server</span> để proxy áp dụng URL mới.
        </div>
      </div>

      {/* ── MIDDLE: Viettel S-Invoice ── */}
      <ViettelSection />

      {/* ── RIGHT: Email / EmailJS ── */}
      <EmailSection />
    </div>
  )
}

function ViettelSection() {
  const VIETTEL_DEFAULTS = {
    baseUrl:   'https://demo-sinvoice.viettel.vn',
    username:  '',
    password:  '',
    taxCode:   '',
    demoMode:  false,
  }
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('viettelConfig') || '{}')
      return { ...VIETTEL_DEFAULTS, ...saved }
    } catch { return VIETTEL_DEFAULTS }
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testError, setTestError]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('viettelConfig', JSON.stringify(form))
    clearTokenCache()
    try {
      await fetch('/api/dev/viettel-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: form.baseUrl }),
      })
    } catch {}
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    toast.success('Đã lưu cấu hình Viettel S-Invoice.')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(null); setTestError(null)
    clearTokenCache()
    // Temporarily write form to localStorage so viettelService reads it
    localStorage.setItem('viettelConfig', JSON.stringify(form))
    try {
      await testViettelConnection()
      setTestResult('ok')
      toast.success('Kết nối Viettel S-Invoice thành công!')
    } catch (e) {
      setTestResult('fail')
      setTestError(e.message)
      toast.error('Không thể kết nối — ' + e.message)
    } finally { setTesting(false) }
  }

  const isProd = !form.baseUrl.includes('demo')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow shrink-0"
          style={{ background: 'linear-gradient(135deg,#ee0033,#cc0022)' }}>
          <span className="text-white font-black text-xs leading-none">VT</span>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Viettel S-Invoice</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hóa đơn điện tử · Kiểm tra trạng thái HĐĐT</p>
        </div>
        {isProd && (
          <span className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            PRODUCTION
          </span>
        )}
        {!isProd && (
          <span className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            DEMO
          </span>
        )}
      </div>

      {/* Connection status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        testResult === 'ok'   ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
        : testResult === 'fail' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'
      }`}>
        <Wifi size={15} className={testResult === 'ok' ? 'text-emerald-500' : testResult === 'fail' ? 'text-red-400' : 'text-slate-400'} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${
            testResult === 'ok' ? 'text-emerald-700 dark:text-emerald-300'
            : testResult === 'fail' ? 'text-red-600 dark:text-red-400'
            : 'text-slate-500 dark:text-slate-400'
          }`}>
            {testResult === 'ok' ? 'Kết nối Viettel thành công'
              : testResult === 'fail' ? 'Kết nối thất bại'
              : 'Chưa kiểm tra kết nối'}
          </div>
          {testError && <div className="text-xs text-red-500 mt-0.5 truncate">{testError}</div>}
        </div>
        {testResult === 'ok' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
      </div>

      <Card>
        <CardHeader icon={Globe} title="Thông tin kết nối Viettel S-Invoice" color="red" />
        <CardBody className="space-y-4">

          {/* Demo Mode toggle */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
            form.demoMode
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
          }`} onClick={() => set('demoMode')(!form.demoMode)}>
            <div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                Demo Mode
                {form.demoMode && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">BẬT</span>}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Giả lập trạng thái HĐĐT mà không cần kết nối Viettel thật
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.demoMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.demoMode ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>

          {form.demoMode && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2.5">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>Demo Mode đang bật — dữ liệu HĐĐT là <strong>giả lập</strong>, không phản ánh thực tế. Tắt khi có thông tin API Viettel thật.</span>
            </div>
          )}

          <Field label="Base URL">
            <div className="flex gap-2">
              <select
                value={form.baseUrl.includes('demo') ? 'demo' : 'prod'}
                onChange={e => set('baseUrl')(e.target.value === 'demo'
                  ? 'https://demo-sinvoice.viettel.vn'
                  : 'https://sinvoice.viettel.vn')}
                className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="demo">Demo</option>
                <option value="prod">Production</option>
              </select>
              <input readOnly value={form.baseUrl}
                className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-mono" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username (Tài khoản Viettel)" required>
              <TextInput value={form.username} onChange={set('username')} placeholder="0123456789" />
            </Field>
            <Field label="Password" required>
              <input type="password" value={form.password} onChange={e => set('password')(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </Field>
          </div>
          <Field label="Mã số thuế người bán (Seller Tax Code)" required>
            <TextInput value={form.taxCode} onChange={set('taxCode')} placeholder="0123456789" />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleTest} disabled={testing || !form.username || !form.password}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer">
              {testing
                ? <><span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Đang kiểm tra...</>
                : <><Wifi size={14} /> Kiểm tra kết nối</>}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors cursor-pointer">
              {saving
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Đã lưu!' : 'Lưu cấu hình'}
            </button>
          </div>
        </CardBody>
      </Card>

      <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3.5 py-3 leading-relaxed">
        Sau khi lưu, trang <strong>Billing Documents</strong> sẽ hiển thị badge trạng thái HĐĐT (Đã có HĐĐT / Chưa xuất) bằng cách gọi Viettel S-Invoice API với mã Billing Document của SAP.
      </div>
    </div>
  )
}

function EmailSection() {
  const EMAILJS_CONFIGURED =
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
    import.meta.env.VITE_EMAILJS_SERVICE_ID !== 'your_service_id'

  const [form, setForm] = useState({
    serviceId:  import.meta.env.VITE_EMAILJS_SERVICE_ID  || '',
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
    publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '',
    fromName:   'TDI APJ VietInvoice',
    fromEmail:  'envoice@tdiapj.com.vn',
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const [sending, setSending] = useState(false)
  const [saved, setSaved]     = useState(false)

  const sendTest = () => {
    setSending(true)
    setTimeout(() => { setSending(false); toast.success('Email kiểm tra đã được gửi (Demo mode).') }, 1500)
  }
  const handleSave = () => {
    localStorage.setItem('emailConfig', JSON.stringify(form))
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    toast.success('Đã lưu cấu hình Email.')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow shadow-sky-200 dark:shadow-none shrink-0">
          <Mail size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Email / EmailJS</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gửi hóa đơn qua email tự động</p>
        </div>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${
        EMAILJS_CONFIGURED
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'
      }`}>
        <Mail size={15} className={EMAILJS_CONFIGURED ? 'text-emerald-500' : 'text-slate-400'} />
        <div className={`text-sm font-semibold ${EMAILJS_CONFIGURED ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
          {EMAILJS_CONFIGURED ? 'EmailJS đã cấu hình' : 'Chưa cấu hình EmailJS'}
        </div>
        {EMAILJS_CONFIGURED && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-auto shrink-0" />}
      </div>

      <Card>
        <CardHeader icon={Mail} title="Thông tin kết nối EmailJS" color="blue" />
        <CardBody className="space-y-4">
          <Field label="Service ID" required>
            <TextInput value={form.serviceId} onChange={set('serviceId')} placeholder="service_xxxxxxx" />
          </Field>
          <Field label="Template ID" required>
            <TextInput value={form.templateId} onChange={set('templateId')} placeholder="template_xxxxxxx" />
          </Field>
          <Field label="Public Key" required>
            <TextInput value={form.publicKey} onChange={set('publicKey')} placeholder="xxxxxxxxxxxxxxxxxxxx" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên người gửi">
              <TextInput value={form.fromName} onChange={set('fromName')} />
            </Field>
            <Field label="Email người gửi">
              <TextInput value={form.fromEmail} onChange={set('fromEmail')} />
            </Field>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={sendTest} disabled={sending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer">
              {sending
                ? <><span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Đang gửi...</>
                : <><Mail size={14} /> Gửi thử</>}
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer">
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Đã lưu!' : 'Lưu cấu hình'}
            </button>
          </div>
        </CardBody>
      </Card>

      <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3.5 py-3 leading-relaxed">
        Tạo tài khoản miễn phí tại <span className="font-mono text-blue-600 dark:text-blue-400">emailjs.com</span>. Sau khi lưu, hệ thống có thể gửi hóa đơn PDF qua email cho khách hàng.
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: Email / EmailJS
// ══════════════════════════════════════════════
const EMAILJS_CONFIGURED =
  import.meta.env.VITE_EMAILJS_SERVICE_ID &&
  import.meta.env.VITE_EMAILJS_SERVICE_ID !== 'your_service_id'

function EmailPage({ t }) {
  const [form, setForm] = useState({
    serviceId:  import.meta.env.VITE_EMAILJS_SERVICE_ID  || '',
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
    publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '',
    fromName: 'TDI APJ VietInvoice',
    fromEmail: 'envoice@tdiapj.com.vn',
  })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const [sending, setSending] = useState(false)

  const sendTest = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      toast.success('Email kiểm tra đã được gửi (Demo mode).')
    }, 1500)
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings.email.title')} subtitle={t('settings.email.subtitle')} />

      {/* Status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        EMAILJS_CONFIGURED
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
      }`}>
        <Mail size={15} className={EMAILJS_CONFIGURED ? 'text-emerald-500' : 'text-amber-500'} />
        <div className={`text-sm font-medium ${EMAILJS_CONFIGURED ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
          {EMAILJS_CONFIGURED ? t('settings.email.configured') : t('settings.email.notConfigured')}
          {!EMAILJS_CONFIGURED && ' — Điền Service ID, Template ID và Public Key từ emailjs.com'}
        </div>
      </div>

      <Card>
        <CardHeader icon={Mail} title={t('settings.email.provider') + ' · EmailJS'} color="blue" />
        <CardBody>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Field label={t('settings.email.serviceId')}>
              <TextInput value={form.serviceId} onChange={set('serviceId')} placeholder="service_xxxxxxx" />
            </Field>
            <Field label={t('settings.email.templateId')}>
              <TextInput value={form.templateId} onChange={set('templateId')} placeholder="template_xxxxxxx" />
            </Field>
            <Field label={t('settings.email.publicKey')} span={2}>
              <TextInput value={form.publicKey} onChange={set('publicKey')} placeholder="xxxxxxxxxxxxxxxxxxxx" />
            </Field>
            <Field label={t('settings.email.fromName')}>
              <TextInput value={form.fromName} onChange={set('fromName')} />
            </Field>
            <Field label={t('settings.email.fromEmail')}>
              <TextInput value={form.fromEmail} onChange={set('fromEmail')} />
            </Field>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              Tạo tài khoản miễn phí tại <span className="font-mono text-blue-600 dark:text-blue-400">emailjs.com</span>
            </p>
            <button onClick={sendTest} disabled={sending}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-400
                border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-60">
              {sending ? <span className="w-3 h-3 border-2 border-blue-400/40 border-t-blue-500 rounded-full animate-spin" /> : <Mail size={12} />}
              {t('settings.email.testSend')}
            </button>
          </div>
        </CardBody>
      </Card>

      <SaveBar onSave={() => toast.success('Cấu hình email đã được lưu.')} saveLabel="Lưu cấu hình" />
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE: Coming Soon placeholder
// ══════════════════════════════════════════════
function ComingSoonPage({ icon: Icon, title, subtitle, message }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardBody className="py-16 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Icon size={24} className="text-slate-400" />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{message}</div>
          <span className="mt-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold rounded-full">
            Coming Soon
          </span>
        </CardBody>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════
// Page wrapper — consistent layout for all settings pages
// ══════════════════════════════════════════════
function SettingsPageShell({ children, wide }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900">
      <div className={wide ? '' : 'max-w-2xl'}>
        {children}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// Named exports — one per route
// ══════════════════════════════════════════════
export function AppearanceSettingsPage() {
  const t = useT()
  return <SettingsPageShell><AppearancePage t={t} /></SettingsPageShell>
}

export function CompanySettingsPage() {
  const t = useT()
  return <SettingsPageShell><CompanyPage t={t} /></SettingsPageShell>
}

export function InvoiceConfigSettingsPage() {
  const t = useT()
  return <SettingsPageShell><InvoiceConfigPage t={t} /></SettingsPageShell>
}

export function CQTSettingsPage() {
  const t = useT()
  return <SettingsPageShell><CQTPage t={t} /></SettingsPageShell>
}

export function SAPSettingsPage() {
  const t = useT()
  return <SettingsPageShell wide><SAPPage t={t} /></SettingsPageShell>
}

export function EmailSettingsPage() {
  const t = useT()
  return <SettingsPageShell><EmailPage t={t} /></SettingsPageShell>
}

export function UsersSettingsPage() {
  const t = useT()
  return (
    <SettingsPageShell>
      <ComingSoonPage icon={Users} title={t('settings.users.title')}
        subtitle={t('settings.users.subtitle')} message={t('settings.users.comingSoon')} />
    </SettingsPageShell>
  )
}

export function NotificationsSettingsPage() {
  const t = useT()
  return (
    <SettingsPageShell>
      <ComingSoonPage icon={Bell} title={t('settings.notif.title')}
        subtitle={t('settings.notif.subtitle')} message={t('settings.notif.comingSoon')} />
    </SettingsPageShell>
  )
}

export default function Settings() { return null }
