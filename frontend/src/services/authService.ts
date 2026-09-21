import { api } from '@/services/api'
import { supabase } from '@/services/supabase'
import type { Profile, SessionInfo } from '@/types'

export async function fetchMe(): Promise<Profile> {
  return api.get<Profile>('/api/v1/auth/me')
}

export async function fetchSession(): Promise<SessionInfo> {
  return api.get<SessionInfo>('/api/v1/auth/session')
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, metadata: Record<string, string>) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

export async function getSupabaseSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}
