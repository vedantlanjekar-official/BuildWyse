import { createClient } from '@supabase/supabase-js'
import { env } from '@/utils/env'

export const supabase =
  env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey)
    : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
