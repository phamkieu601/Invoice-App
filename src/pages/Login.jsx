import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail, Receipt, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore(s => s.session)
  const login = useAuthStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  if (session) return <Navigate to={redirectTo} replace />

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password, remember })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Không thể đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">
      <div className="hidden lg:flex w-[42%] bg-slate-950 text-white p-10 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-950">
            <Receipt size={20} />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">VietInvoice</div>
            <div className="text-xs text-slate-500">E-Invoice System</div>
          </div>
        </div>

        <div className="max-w-md">
          <div className="text-[11px] font-bold tracking-widest text-blue-300 uppercase mb-4">Secure workspace</div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Quản lý hóa đơn điện tử trong một không gian kiểm soát.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Đăng nhập để truy cập billing documents, phát hành HĐĐT, báo cáo và cấu hình hệ thống.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-slate-500">Role</div>
            <div className="mt-1 font-semibold">Admin</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-slate-500">Mode</div>
            <div className="mt-1 font-semibold">Local Auth</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-slate-500">Session</div>
            <div className="mt-1 font-semibold">Protected</div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
              <Receipt size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">VietInvoice</div>
              <div className="text-xs text-slate-500">E-Invoice System</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Đăng nhập</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Dùng tài khoản được cấp để tiếp tục.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              {!isSupabaseConfigured() && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                  Chưa cấu hình Supabase. Vui lòng nhập VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</span>
                <div className="mt-1.5 relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mật khẩu</span>
                <div className="mt-1.5 relative">
                  <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600"
                />
                Ghi nhớ đăng nhập
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
              >
                <LogIn size={16} />
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Tài khoản được quản lý trong Supabase Auth.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
