import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(url, key)

export function isSupabaseConfigured() {
  return !!(url && key && url.includes('supabase.co') && !url.includes('your-project'))
}
