import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthField, AuthModeTabs, AuthShell } from '@/pages/auth/AuthShell'
import { loginSchema, type LoginForm } from '@/schemas/auth'
import { fetchMe, signInWithPassword } from '@/services/authService'
import { isSupabaseConfigured } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { getDashboardPath } from '@/utils/roles'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setDevUser, setProfile } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL to continue.')
      }
      const result = await signInWithPassword(data.email, data.password)
      if (!result.session?.access_token) throw new Error('No session returned')
      setDevUser(null)
      setToken(result.session.access_token)
      const profile = await fetchMe()
      setProfile(profile)
      navigate(getDashboardPath(profile.roles))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="w-full text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
          Welcome back
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0d2a28]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[#6b7c78]">
          Use your BuildWyse email and password. We’ll open the right workspace for your account.
        </p>
      </div>

      <AuthModeTabs mode="signin" />

      {error && (
        <Alert variant="destructive" className="mt-5 text-left">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 w-full space-y-4 text-left">
        <AuthField label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a96]" />
            <Input
              type="email"
              placeholder="you@email.com"
              className="h-11 rounded-lg border-[#d7e2df] pl-10 text-left"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </AuthField>

        <AuthField label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a96]" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="h-11 rounded-lg border-[#d7e2df] pl-10 pr-10 text-left"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9a96] hover:text-[#0d2a28]"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </AuthField>

        <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  )
}
