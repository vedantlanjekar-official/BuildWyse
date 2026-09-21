import { CalendarMonthView } from '@/components/calendar/CalendarMonthView'
import {
  DetailDialog,
  MetricTile,
  SectionHeader,
  StatePanel,
  formatDate,
} from '@/components/client/SectionKit'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { projectService } from '@/services/projectService'
import type { CalendarEvent, Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

export function ProjectCalendarPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.get(id!),
    enabled: !!id,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar', id],
    queryFn: () => projectService.calendar(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const createMutation = useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      event_type: string
      starts_at: string
    }) =>
      projectService.createCalendarEvent({
        project_id: id!,
        title: input.title,
        description: input.description,
        event_type: input.event_type,
        starts_at: input.starts_at,
      }),
    onSuccess: async () => {
      setCreateError(null)
      await queryClient.invalidateQueries({ queryKey: ['calendar', id] })
    },
    onError: (err) => setCreateError((err as Error).message || 'Could not create event'),
  })

  const project = projectQuery.data as Project | undefined
  const events = useMemo(() => {
    const rows = [...(data ?? [])]
    return rows.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }, [data])

  const upcoming = events.filter((e) => {
    const d = new Date(e.starts_at)
    return !Number.isNaN(d.getTime()) ? d.getTime() >= Date.now() - 86400000 : true
  })

  return (
    <div>
      <SectionHeader
        title="Project calendar"
        description="Select a date to view details or add your own meetings, reviews, and deadlines."
      />

      <StatePanel
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={false}
        emptyTitle="No calendar events yet"
        emptyDescription="Phase and milestone deadlines appear here once planning starts."
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Total events" value={events.length} />
          <MetricTile label="Upcoming" value={upcoming.length} />
          <MetricTile
            label="Next event"
            value={upcoming[0] ? formatDate(upcoming[0].starts_at) : '—'}
          />
        </div>

        <CalendarMonthView
          events={events}
          projectTitle={project?.title}
          showProject
          onSelectEvent={setSelected}
          canAddEvent
          defaultProjectId={id}
          createPending={createMutation.isPending}
          createError={createError}
          onCreateEvent={async (input) => {
            await createMutation.mutateAsync({
              title: input.title,
              description: input.description,
              event_type: input.event_type,
              starts_at: input.starts_at,
            })
          }}
        />
      </StatePanel>

      <DetailDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.title ?? 'Event'}
        description="Calendar event details"
      >
        {selected && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Project:</span> {project?.title ?? selected.projectTitle ?? '—'}
            </p>
            <p>
              <span className="font-medium">Day:</span>{' '}
              {new Date(selected.starts_at).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p>
              <span className="font-medium">Type:</span> {selected.event_type ?? 'schedule'}
            </p>
            <p>
              <span className="font-medium">When:</span> {formatDate(selected.starts_at)}
            </p>
            {selected.ends_at != null && (
              <p>
                <span className="font-medium">Ends:</span> {formatDate(selected.ends_at)}
              </p>
            )}
            <p className="leading-relaxed text-[var(--color-muted-foreground)]">
              {selected.description ?? 'No additional notes.'}
            </p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
