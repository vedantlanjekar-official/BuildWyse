import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMe, getSupabaseSession, signOut as supabaseSignOut } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

export function useAuthInit() {
  const { setProfile, setToken, setLoading, token, devUserId, hasHydrated } = useAuthStore()

  useEffect(() => {
    if (!hasHydrated) return
    async function init() {
      setLoading(true)
      try {
        if (!token && !devUserId) {
          const session = await getSupabaseSession()
          if (session?.access_token) setToken(session.access_token)
        }
        const profile = await fetchMe()
        setProfile(profile)
      } catch {
        useAuthStore.getState().logout()
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [setProfile, setToken, setLoading, token, devUserId, hasHydrated])
}

export function useProfile() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['profile', profile?.id],
    queryFn: fetchMe,
    enabled: !!profile,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const logout = useAuthStore((s) => s.logout)

  return async () => {
    await supabaseSignOut()
    logout()
    queryClient.clear()
  }
}
