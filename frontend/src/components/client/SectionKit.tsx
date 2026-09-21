import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/utils/cn'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { useId, type ReactNode } from 'react'

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title?: string
  description?: string
  /** @deprecated Kept for call-site compatibility; no longer rendered */
  saved?: boolean
  /** @deprecated Kept for call-site compatibility; no longer rendered */
  live?: boolean
  actions?: ReactNode
}) {
  if (!title && !description && !actions) return null
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {title ? <h2 className="font-display text-2xl font-semibold text-[#0d2a28]">{title}</h2> : null}
        {description ? <p className="mt-1 max-w-2xl text-sm text-[#6b7c78]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function SoftCard({
  children,
  className,
  title,
  subtitle,
  action,
  accent,
}: {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[22px] border border-[#e2ebe8] bg-white shadow-[0_14px_40px_rgba(13,42,40,0.05)]',
        accent && 'bg-gradient-to-br from-white via-white to-[#eef8f6]',
        className,
      )}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-[#eef3f1] px-5 py-4">
          <div>
            {title ? <h3 className="font-display text-base font-semibold text-[#0d2a28]">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-[#8a9a96]">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function StatePanel({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: {
  isLoading: boolean
  isError: boolean
  error?: Error | null
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  children: ReactNode
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-[#dce6e3] bg-white/80">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-[#6b7c78]">Loading saved data…</p>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[22px] border border-red-200 bg-red-50/80 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-red-700">{error?.message ?? 'Something went wrong'}</p>
      </div>
    )
  }
  if (isEmpty) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-[#dce6e3] bg-white px-6 text-center shadow-[0_10px_30px_rgba(13,42,40,0.04)]">
        <Inbox className="h-8 w-8 text-[#9aaba6]" />
        <div>
          <p className="font-medium text-[#0d2a28]">{emptyTitle ?? 'Nothing saved yet'}</p>
          {emptyDescription ? <p className="mt-1 text-sm text-[#6b7c78]">{emptyDescription}</p> : null}
        </div>
        {emptyAction}
      </div>
    )
  }
  return <>{children}</>
}

export function MetricTile({
  label,
  value,
  hint,
  icon,
  tone = 'teal',
}: {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
  tone?: 'teal' | 'blue' | 'amber' | 'rose' | 'slate'
}) {
  const tones = {
    teal: 'from-[#0d2a28] to-[#1a5c55]',
    blue: 'from-[#1e3a5f] to-[#2f6fed]',
    amber: 'from-[#7a4a12] to-[#e8a54b]',
    rose: 'from-[#6b2a3a] to-[#e07a8a]',
    slate: 'from-[#2a3533] to-[#5a6d68]',
  }
  return (
    <div className="rounded-[22px] border border-[#e2ebe8] bg-white p-5 shadow-[0_14px_40px_rgba(13,42,40,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a9a96]">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0d2a28]">{value}</p>
          {hint ? <p className="mt-1 text-xs text-[#6b7c78]">{hint}</p> : null}
        </div>
        {icon ? (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md', tones[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  className,
}: {
  value: number
  size?: number
  stroke?: number
  className?: string
}) {
  const id = useId()
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} className={cn('-rotate-90', className)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8eeec" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d2a28" />
          <stop offset="100%" stopColor="#3db8a8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function InteractiveCard({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'w-full rounded-[20px] border border-[#e2ebe8] bg-white p-4 text-left shadow-[0_10px_30px_rgba(13,42,40,0.04)] transition duration-300',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-[#0d2a28]/25 hover:shadow-[0_20px_44px_rgba(13,42,40,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DetailDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-3xl border-[#dce6e3]"
    >
      {children}
    </Dialog>
  )
}

export function RegenerateButton({
  onClick,
  pending,
  label = 'Regenerate',
}: {
  onClick: () => void
  pending?: boolean
  label?: string
}) {
  return (
    <Button variant="outline" size="sm" className="rounded-xl" onClick={onClick} disabled={pending}>
      <RefreshCw className={cn('mr-2 h-4 w-4', pending && 'animate-spin')} />
      {pending ? 'Working…' : label}
    </Button>
  )
}

export function DocumentSheet({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-[24px] border border-[#dce6e3] bg-[#fcfcfa] shadow-[0_16px_40px_rgba(13,42,40,0.06)]">
      <div className="border-b border-[#eef3f1] bg-white px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">BuildWyse Document</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-[#0d2a28]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[#6b7c78]">{subtitle}</p> : null}
      </div>
      <div className="space-y-5 px-8 py-7 text-sm leading-relaxed text-[#0d2a28]">{children}</div>
    </div>
  )
}

export function formatCurrency(amount: unknown, currency = 'INR') {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0)
  if (Number.isNaN(n)) return String(amount ?? '—')
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${currency} ${n}`
  }
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatState(state: string) {
  return state.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
