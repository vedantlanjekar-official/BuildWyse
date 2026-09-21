import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthField, AuthModeTabs, AuthShell } from '@/pages/auth/AuthShell'
import { registerSchema, type RegisterForm } from '@/schemas/auth'
import { fetchMe, signUp } from '@/services/authService'
import { isSupabaseConfigured } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { getDashboardPath } from '@/utils/roles'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

const accountOptions: Array<{ value: RegisterForm['accountType']; label: string }> = [
  { value: 'client', label: 'Client' },
  { value: 'freelancer', label: 'Freelancer' },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { setToken, setProfile } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { accountType: 'client' },
  })

  const accountType = watch('accountType')

  const onSubmit = async (data: RegisterForm) => {
    setError(null)
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL to continue.')
      }
      const result = await signUp(data.email, data.password, {
        full_name: data.fullName,
        account_type: data.accountType,
      })
      if (!result.session?.access_token) {
        setError('Check your email to confirm your account, then sign in.')
        return
      }
      setToken(result.session.access_token)
      const profile = await fetchMe()
      setProfile(profile)
      navigate(getDashboardPath(profile.roles))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="w-full text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
          Get started
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0d2a28]">
          Create account
        </h1>
        <p className="mt-2 text-sm text-[#6b7c78]">
          Choose Client or Freelancer when you create your account. Sign-in uses the same page for everyone.
        </p>
      </div>

      <AuthModeTabs mode="signup" />

      <div className="mt-5 grid w-full grid-cols-2 gap-1 rounded-lg border border-[#e5ecea] bg-[#f4f7f6] p-1">
        {accountOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setValue('accountType', opt.value, { shouldValidate: true })}
            className={`rounded-md px-2 py-2 text-center text-xs font-semibold transition sm:text-sm ${
              accountType === opt.value
                ? 'bg-white text-[#0d2a28] shadow-sm'
                : 'text-[#6b7c78] hover:text-[#0d2a28]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant={error.includes('email') ? 'default' : 'destructive'} className="mt-5 text-left">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 w-full space-y-4 text-left">
        <AuthField label="Full name">
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a96]" />
            <Input
              placeholder="Your name"
              className="h-11 rounded-lg border-[#d7e2df] pl-10 text-left"
              {...register('fullName')}
            />
          </div>
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </AuthField>

        <AuthField label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a96]" />
            <Input
              type="email"
              placeholder="you@company.com"
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

        <AuthField label="Confirm password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a96]" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="h-11 rounded-lg border-[#d7e2df] pl-10 pr-10 text-left"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9a96] hover:text-[#0d2a28]"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </AuthField>

        <input type="hidden" {...register('accountType')} />

        <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
