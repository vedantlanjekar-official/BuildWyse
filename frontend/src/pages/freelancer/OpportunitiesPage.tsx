import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BriefcaseBusiness } from 'lucide-react'
import { Link } from 'react-router-dom'

export function OpportunitiesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['projects', 'opportunities'],
    queryFn: projectService.list,
  })

  const open = (data ?? []).filter((p: Project) =>
    ['MATCHING', 'FREELANCER_SELECTION', 'REQUIREMENTS', 'PROPOSAL', 'BUDGET'].includes(p.state),
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-white to-[var(--color-accent)]/40 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Opportunities</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Open engagements</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          Projects ready for proposals and matching. Your submitted proposals persist and reload from project history.
        </p>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={open}
        emptyTitle="No open opportunities"
        emptyDescription="Check back later for new client projects."
      >
        {(projects) => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]">
                      <BriefcaseBusiness className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <Badge className="mt-2" variant="outline">{p.state}</Badge>
                    </div>
                  </div>
                </div>
                {p.description && (
                  <p className="mt-3 line-clamp-3 text-sm text-[var(--color-muted-foreground)]">{p.description}</p>
                )}
                <Link to={`/projects/${p.id}/proposal`} className="mt-5 inline-block">
                  <Button size="sm">
                    Open proposal workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
