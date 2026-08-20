import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearSupabaseBrowserSession } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthState {
  user: UserProfile | null
  session: any
  loading: boolean
  setUser: (user: UserProfile | null) => void
  setSession: (session: any) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      signOut: async () => {
        await clearSupabaseBrowserSession()
        set({ user: null, session: null })
      }
    }),
    { name: 'HorecaSmartSalesApp-auth', partialize: (s) => ({ user: s.user }) }
  )
)
