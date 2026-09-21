import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import type { ReactNode } from 'react'

export function QueryState<T>({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  data,
}: {
  isLoading: boolean
  isError: boolean
  error?: Error | null
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  children: (data: T) => ReactNode
  data: T | undefined
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        {error?.message ?? 'Something went wrong loading data.'}
      </Alert>
    )
  }

  if (isEmpty || (Array.isArray(data) && data.length === 0)) {
    return (
      <EmptyState
        title={emptyTitle ?? 'No data yet'}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  if (data === undefined) return null
  return <>{children(data)}</>
}
