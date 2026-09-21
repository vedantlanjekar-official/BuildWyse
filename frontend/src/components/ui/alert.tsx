import { cn } from '@/utils/cn'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { HTMLAttributes } from 'react'

const icons = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
}

export function Alert({
  variant = 'default',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'destructive' }) {
  const Icon = icons[variant]
  const styles = {
    default: 'border-slate-200 bg-slate-50 text-slate-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    destructive: 'border-red-200 bg-red-50 text-red-900',
  }
  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', styles[variant], className)}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
