import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function mapSession(session, profile = null) {
  if (!session?.user) return null

  const metadata = session.user.user_metadata || {}
  return {
    accessToken: session.access_token,
    signedInAt: session.user.last_sign_in_at || new Date().toISOString(),
    user: {
      id: session.user.id,
      email: session.user.email,
      name: profile?.full_name || metadata.full_name || metadata.name || session.user.email,
      role: profile?.role || metadata.role || 'user',
    },
  }
}

async function loadProfile(userId) {
  if (!isSupabaseConfigured() || !userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  return data
}

export const useAuthStore = create((set, get) => ({
  session: null,
  initializing: true,
  error: null,
  initStarted: false,

  init: async () => {
    if (get().initStarted) return
    set({ initStarted: true })

    if (!isSupabaseConfigured()) {
      set({ session: null, initializing: false, error: null })
      return
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      set({ session: null, initializing: false, error: error.message })
      return
    }

    const profile = await loadProfile(data.session?.user?.id)
    set({ session: mapSession(data.session, profile), initializing: false, error: null })
  },

  login: async ({ email, password }) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Chưa cấu hình Supabase URL và Anon Key.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim(),
      password,
    })

    if (error) {
      throw new Error(error.message || 'Email hoặc mật khẩu không đúng.')
    }

    const profile = await loadProfile(data.session?.user?.id)
    const session = mapSession(data.session, profile)
    set({ session, error: null })
    return session
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    set({ session: null })
  },
}))
