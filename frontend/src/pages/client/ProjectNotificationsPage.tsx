import {
  SectionHeader,
  StatePanel,
  formatDate,
} from '@/components/client/SectionKit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { notificationService } from '@/services/projectService'
import type { Notification, Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

export function ProjectNotificationsPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list() as Promise<Notification[]>,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationService.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = useMemo(() => {
    const all = data ?? []
    return all.filter((n) => !n.project_id || String(n.project_id) === id)
  }, [data, id])

  const unread = items.filter((n) => !n.is_read)

  return (
    <div>
      <SectionHeader
        title="Project notifications"
        description={`Activity alerts for ${project.title}.`}
        actions={
          unread.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => markRead.mutate(unread.map((n) => n.id))}
              disabled={markRead.isPending}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <StatePanel
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={items.length === 0}
        emptyTitle="No project notifications"
        emptyDescription="Updates for this project will appear here."
      >
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-4 rounded-[20px] border border-[#e2ebe8] bg-white p-4 shadow-[0_10px_30px_rgba(13,42,40,0.04)]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[var(--color-accent)] p-2 text-[var(--color-primary)]">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[#0d2a28]">{n.title}</p>
                    {!n.is_read ? <Badge>New</Badge> : null}
                    {n.notification_type ? (
                      <Badge variant="outline">{n.notification_type}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{n.body}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{formatDate(n.created_at)}</p>
                </div>
              </div>
              {!n.is_read ? (
                <Button variant="ghost" size="sm" onClick={() => markRead.mutate([n.id])}>
                  Mark read
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </StatePanel>
    </div>
  )
}
