import {
  DetailDialog,
  DocumentSheet,
  RegenerateButton,
  SectionHeader,
  StatePanel,
  formatCurrency,
  formatDate,
} from '@/components/client/SectionKit'
import { Badge } from '@/components/ui/badge'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { Button } from '@/components/ui/button'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

type BudgetRow = Record<string, unknown>

export function ProjectBudgetPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<BudgetRow | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['budgets', id],
    queryFn: () => projectService.listBudgets(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      projectService.budgetEstimate({
        project_id: id,
        client_budget: project.estimated_budget ? Number(project.estimated_budget) : undefined,
        context: project.description ?? project.title,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets', id] }),
  })

  const preferenceMutation = useMutation({
    mutationFn: (model: string) =>
      projectService.setBudgetPreference({ project_id: id, development_model: model, notes: 'Selected from budget document' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  })

  const budgets = data ?? []
  const hasSaved = budgets.length > 0
  const byType = useMemo(() => {
    const map: Record<string, BudgetRow> = {}
    for (const b of budgets) map[String(b.budget_type)] = b
    return map
  }, [budgets])

  const models = [
    { key: 'individual', label: 'Individual Freelancer', blurb: 'Single verified specialist for focused delivery.' },
    { key: 'team', label: 'Freelancer Team', blurb: 'Coordinated specialists with a team lead.' },
    { key: 'enterprise', label: 'Enterprise Company', blurb: 'Managed delivery with organizational capacity.' },
  ]

  return (
    <div>
      <SectionHeader
        live
        title="Budget analysis"
        description="AI budget recommendations are saved to your project. Regenerate only when you need a fresh estimate."
        saved={hasSaved}
        actions={
          <>
            {!hasSaved && (
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? 'Generating…' : 'Generate budget'}
              </Button>
            )}
            {hasSaved && (
              <RegenerateButton onClick={() => generateMutation.mutate()} pending={generateMutation.isPending} />
            )}
          </>
        }
      />

      <StatePanel
        isLoading={isLoading}
        isError={isError || generateMutation.isError}
        error={(error || generateMutation.error) as Error | null}
        isEmpty={!hasSaved}
        emptyTitle="No budget document yet"
        emptyDescription="Generate a three-model budget recommendation for this project."
        emptyAction={
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            Generate budget
          </Button>
        }
      >
        <DocumentSheet
          title="Project Budget Recommendation"
          subtitle={`${project.title} · Generated ${formatDate(String(budgets[0]?.created_at ?? ''))}`}
        >
          <p>
            This document summarizes recommended investment ranges across BuildWyse development models. Figures are
            advisory and do not authorize payments until milestones are approved.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {models.map((m) => {
              const row = byType[m.key]
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => row && setSelected(row)}
                  className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-left transition hover:border-[var(--color-primary)]/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{m.label}</p>
                    {project.development_model === m.key && <Badge variant="success">Selected</Badge>}
                  </div>
                  <p className="mt-3 font-display text-xl font-semibold">
                    {row ? formatCurrency(row.min_amount ?? row.amount, String(row.currency ?? 'INR')) : '—'}
                    {row?.max_amount ? (
                      <span className="text-sm font-normal text-[var(--color-muted-foreground)]">
                        {' '}
                        – {formatCurrency(row.max_amount, String(row.currency ?? 'INR'))}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{m.blurb}</p>
                  {row && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        preferenceMutation.mutate(m.key)
                      }}
                      disabled={preferenceMutation.isPending}
                    >
                      Choose model
                    </Button>
                  )}
                </button>
              )
            })}
          </div>

          {byType.client_estimate && (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Client estimate
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatCurrency(byType.client_estimate.amount, String(byType.client_estimate.currency ?? 'INR'))}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-white p-4 text-[var(--color-muted-foreground)]">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Click any model card for full rationale and AI analysis. Saved budget rows persist across sessions and
              will load automatically when you return.
            </p>
          </div>
        </DocumentSheet>
      </StatePanel>

      <DetailDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={`${String(selected?.budget_type ?? '').replace('_', ' ')} budget`}
        description="Persisted budget record"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Range: </span>
              {formatCurrency(selected.min_amount ?? selected.amount, String(selected.currency ?? 'INR'))}
              {selected.max_amount ? ` – ${formatCurrency(selected.max_amount, String(selected.currency ?? 'INR'))}` : ''}
            </p>
            <p>
              <span className="font-medium">Status: </span>
              {String(selected.status)}
            </p>
            <p className="leading-relaxed text-[var(--color-muted-foreground)]">
              {String(selected.rationale ?? 'No rationale stored.')}
            </p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
