import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-white px-6 py-16 text-center">
      <Inbox className="mb-4 h-10 w-10 text-[var(--color-muted-foreground)]" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
