import { QueryState } from '@/components/QueryState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { notificationService } from '@/services/projectService'
import type { Notification } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list() as Promise<Notification[]>,
  })

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationService.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay updated on project activity"
        actions={
          data?.some((n) => !n.is_read) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markRead.mutate(data.filter((n) => !n.is_read).map((n) => n.id))}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data}
        emptyTitle="No notifications"
        emptyDescription="You're all caught up."
      >
        {(items) => (
          <div className="space-y-3">
            {items.map((n) => (
              <Card key={n.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.is_read && <Badge variant="default">New</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{n.body}</p>
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markRead.mutate([n.id])}>
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
