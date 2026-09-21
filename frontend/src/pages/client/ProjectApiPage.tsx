import { QueryState } from '@/components/QueryState'
import { JsonTable } from '@/components/JsonTable'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams } from 'react-router-dom'

type ApiKey =
  | 'documents'
  | 'budget'
  | 'matching'
  | 'candidates'
  | 'calendar'
  | 'health'
  | 'changes'
  | 'services'
  | 'payments'
  | 'certificates'
  | 'proposals'
  | 'phases'

const fetchers: Record<ApiKey, (id: string) => Promise<unknown>> = {
  documents: projectService.documents,
  budget: (id) => projectService.budgetEstimate({ project_id: id, scope_summary: 'Initial estimate' }),
  matching: (id) => projectService.runMatching(id),
  candidates: (id) => projectService.runMatching(id).then((r) => r.candidates),
  calendar: projectService.calendar,
  health: projectService.health,
  changes: projectService.changes,
  services: projectService.services,
  payments: (id) => projectService.listPayments(id),
  certificates: (id) => projectService.listCertificates(id).catch(() => []),
  proposals: projectService.proposals,
  phases: projectService.phases,
}

export function ProjectApiPage({
  apiKey,
  title,
  description,
  actionLabel,
  showAction = false,
}: {
  apiKey: ApiKey
  title: string
  description?: string
  actionLabel?: string
  showAction?: boolean
}) {
  const { id } = useParams<{ id: string }>()
  useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['project', id, apiKey],
    queryFn: () => fetchers[apiKey](id!),
    enabled: !!id && !showAction,
  })

  const mutation = useMutation({
    mutationFn: () => fetchers[apiKey](id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id, apiKey] }),
  })

  const rows = normalizeRows(data)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>}
        </div>
        {showAction && (
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Running…' : actionLabel ?? 'Run'}
          </Button>
        )}
      </div>

      {mutation.isError && <Alert variant="destructive" className="mb-4">{(mutation.error as Error).message}</Alert>}

      {showAction ? (
        mutation.data ? (
          <Card><CardContent className="p-4"><pre className="overflow-auto text-xs">{JSON.stringify(mutation.data, null, 2)}</pre></CardContent></Card>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">Click the action button to fetch data.</p>
        )
      ) : (
        <QueryState isLoading={isLoading || mutation.isPending} isError={isError} error={error} data={data ?? mutation.data} emptyTitle={`No ${title.toLowerCase()} data`}>
          {() =>
            rows.length > 0 ? (
              <JsonTable rows={rows} />
            ) : (
              <Card><CardContent className="p-4"><pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre></CardContent></Card>
            )
          }
        </QueryState>
      )}
    </div>
  )
}

function normalizeRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') return [data as Record<string, unknown>]
  return []
}
