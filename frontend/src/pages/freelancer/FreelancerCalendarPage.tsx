import { CalendarMonthView } from '@/components/calendar/CalendarMonthView'
import {
  DetailDialog,
  MetricTile,
  SectionHeader,
  StatePanel,
  formatDate,
} from '@/components/client/SectionKit'
import { projectService } from '@/services/projectService'
import type { CalendarEvent, Project } from '@/types'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

export function FreelancerCalendarPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: projectService.list })
  const projects = projectsQuery.data ?? []

  const calendarQueries = useQueries({
    queries: projects.map((p: Project) => ({
      queryKey: ['calendar', p.id],
      queryFn: async (): Promise<CalendarEvent[]> => {
        const events = await projectService.calendar(p.id)
        return events.map((e) => ({ ...e, projectTitle: p.title }))
      },
      enabled: !!p.id,
    })),
  })

  const createMutation = useMutation({
    mutationFn: (input: {
      project_id: string
      title: string
      description?: string
      event_type: string
      starts_at: string
    }) => projectService.createCalendarEvent(input),
    onSuccess: async (_data, vars) => {
      setCreateError(null)
      await queryClient.invalidateQueries({ queryKey: ['calendar', vars.project_id] })
    },
    onError: (err) => setCreateError((err as Error).message || 'Could not create event'),
  })

  const isLoading = projectsQuery.isLoading || calendarQueries.some((q) => q.isLoading)
  const isError = projectsQuery.isError || calendarQueries.some((q) => q.isError)
  const error = (projectsQuery.error || calendarQueries.find((q) => q.error)?.error) as Error | null

  const events = useMemo(() => {
    const rows = calendarQueries.flatMap((q) => q.data ?? [])
    return rows.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }, [calendarQueries])

  const upcoming = events.filter((e) => {
    const d = new Date(e.starts_at)
    return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now() - 86400000
  })

  return (
    <div>
      <SectionHeader
        title="Calendar"
        description="Select a date to view details or add your own event on a project."
        saved={events.length > 0}
      />
      <StatePanel
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={false}
        emptyTitle="No calendar events"
        emptyDescription="Project deadlines appear here once planning milestones exist."
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Events" value={events.length} />
          <MetricTile label="Projects scanned" value={projects.length} />
          <MetricTile label="Next" value={upcoming[0] ? formatDate(upcoming[0].starts_at) : '—'} />
        </div>

        <CalendarMonthView
          events={events}
          showProject
          onSelectEvent={setSelected}
          canAddEvent={projects.length > 0}
          projects={projects.map((p) => ({ id: p.id, title: p.title }))}
          createPending={createMutation.isPending}
          createError={createError}
          onCreateEvent={async (input) => {
            if (!input.project_id) throw new Error('Select a project')
            await createMutation.mutateAsync({
              project_id: input.project_id,
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
              <span className="font-medium">Project:</span> {selected.projectTitle ?? '—'}
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
            <p className="leading-relaxed text-[var(--color-muted-foreground)]">
              {selected.description ?? 'No additional notes.'}
            </p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
