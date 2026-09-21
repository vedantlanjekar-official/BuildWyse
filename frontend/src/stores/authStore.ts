import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAccessToken, setDevUserId } from '@/services/api'
import type { Profile, Role } from '@/types'

interface AuthState {
  profile: Profile | null
  token: string | null
  devUserId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  hasHydrated: boolean
  setProfile: (profile: Profile | null) => void
  setToken: (token: string | null) => void
  setDevUser: (userId: string | null) => void
  setLoading: (loading: boolean) => void
  setHasHydrated: (hydrated: boolean) => void
  logout: () => void
  roles: () => Role[]
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      token: null,
      devUserId: null,
      isLoading: true,
      isAuthenticated: false,
      hasHydrated: false,
      setProfile: (profile) =>
        set({ profile, isAuthenticated: !!profile }),
      setToken: (token) => {
        setAccessToken(token)
        set({ token })
      },
      setDevUser: (devUserId) => {
        setDevUserId(devUserId)
        set({ devUserId, token: null })
        setAccessToken(null)
      },
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      logout: () => {
        setAccessToken(null)
        setDevUserId(null)
        set({ profile: null, token: null, devUserId: null, isAuthenticated: false })
      },
      roles: () => get().profile?.roles ?? [],
    }),
    {
      name: 'buildwyse-auth',
      partialize: (state) => ({
        token: state.token,
        devUserId: state.devUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAccessToken(state.token)
        if (state?.devUserId) setDevUserId(state.devUserId)
        state?.setHasHydrated(true)
      },
    },
  ),
)
