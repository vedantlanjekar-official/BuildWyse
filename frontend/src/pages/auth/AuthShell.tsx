import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(280px,30%)_minmax(0,70%)]">
      {/* Left — auth form (~30%) */}
      <aside className="relative z-10 flex min-h-screen flex-col items-center justify-center border-r border-[#e5ecea] bg-white px-6 py-8 sm:px-8">
        <div className="flex w-full max-w-[360px] flex-col items-stretch text-left">
          <Link to="/" className="text-center font-display text-xl font-semibold tracking-tight text-[#0d2a28]">
            BuildWyse
          </Link>
          <div className="mt-8 w-full">{children}</div>
          <Link to="/" className="mt-6 w-full">
            <Button
              variant="outline"
              className="h-11 w-full rounded-lg border-[#d7e2df] text-sm font-semibold text-[#0d2a28] hover:bg-[#f4f7f6]"
            >
              Know more about BuildWyse
            </Button>
          </Link>
          <p className="mt-6 text-center text-[11px] tracking-wide text-[#7a8a86]">
            Secured with Supabase Auth · BuildWyse.in
          </p>
        </div>
      </aside>

      {/* Right — looping video (~70%) */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0d2a28] lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/auth-bg.webm"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </section>
    </div>
  )
}

export function AuthModeTabs({ mode }: { mode: 'signin' | 'signup' }) {
  return (
    <div className="mt-6 grid w-full grid-cols-2 gap-1 rounded-lg border border-[#e5ecea] bg-[#f4f7f6] p-1">
      <Link
        to="/login"
        className={`rounded-md px-3 py-2 text-center text-sm font-semibold transition ${
          mode === 'signin'
            ? 'bg-white text-[#0d2a28] shadow-sm'
            : 'text-[#6b7c78] hover:text-[#0d2a28]'
        }`}
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className={`rounded-md px-3 py-2 text-center text-sm font-semibold transition ${
          mode === 'signup'
            ? 'bg-white text-[#0d2a28] shadow-sm'
            : 'text-[#6b7c78] hover:text-[#0d2a28]'
        }`}
      >
        Sign Up
      </Link>
    </div>
  )
}

export function AuthField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="w-full text-left">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f716c]">
        {label}
      </label>
      {children}
    </div>
  )
}
