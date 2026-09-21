import { ProjectPortfolioCard } from '@/components/projects/ProjectPortfolioCard'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { clientService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import type { Project } from '@/types'
import { cn } from '@/utils/cn'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, FolderKanban, Plus, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ClientDashboardData {
  client_id: string
  project_count: number
  projects: Project[]
}

export function ClientDashboard() {
  const profile = useAuthStore((s) => s.profile)
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['client', 'dashboard'],
    queryFn: () => clientService.dashboard() as Promise<ClientDashboardData>,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const projects = data?.projects ?? []
  const active = projects.filter((p) => !['COMPLETED', 'CANCELLED', 'ON_HOLD'].includes(p.state)).length
  const completed = projects.filter((p) => p.state === 'COMPLETED').length
  const assigned = projects.filter((p) => p.assigned_freelancer_id || p.assigned_org_id).length
  const budgeted = projects.filter((p) => p.estimated_budget != null && p.estimated_budget !== '').length

  const metricTiles = [
    { label: 'Total projects', value: data?.project_count ?? '—', icon: FolderKanban, delay: 'bw-rise-delay-1' },
    { label: 'Active pipeline', value: data ? active : '—', icon: Sparkles, delay: 'bw-rise-delay-2' },
    { label: 'Completed', value: data ? completed : '—', icon: CheckCircle2, delay: 'bw-rise-delay-3' },
    {
      label: 'Assigned',
      value: data ? assigned : '—',
      icon: Users,
      delay: 'bw-rise-delay-4',
      hint: data ? `${budgeted} with budget` : undefined,
    },
  ]

  return (
    <div className="relative space-y-8 pb-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(26,92,85,0.14),_transparent_58%)]"
      />

      <section className="bw-fade-up relative overflow-hidden rounded-[32px] border border-[#dce6e3] bg-gradient-to-br from-[#0d2a28] via-[#143834] to-[#1a5c55] text-white shadow-[0_28px_70px_rgba(13,42,40,0.22)]">
        <div
          aria-hidden
          className="bw-grid-move pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div aria-hidden className="bw-glow-pulse pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl" />
        <div aria-hidden className="bw-drift pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-emerald-200/15 blur-3xl" />
        <div aria-hidden className="bw-scan pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative px-6 py-9 sm:px-9 sm:py-11">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                Live command center
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-50/85 sm:text-base">
                Your projects update in realtime — scope, budget, matching, and delivery health in one cinematic
                workspace.
              </p>
            </div>
            <Link to="/projects?new=1">
              <Button className="h-11 rounded-xl bg-white text-[#0d2a28] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-teal-50">
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Button>
            </Link>
          </div>

          <div className="relative mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricTiles.map((tile) => (
              <div
                key={tile.label}
                className={cn(
                  'bw-rise group relative overflow-hidden rounded-2xl border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-md transition hover:bg-white/[0.14]',
                  tile.delay,
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100/75">{tile.label}</p>
                  <tile.icon className="h-4 w-4 text-teal-100/85 transition group-hover:scale-110" />
                </div>
                <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{tile.value}</p>
                {tile.hint ? <p className="mt-1 text-xs text-teal-100/65">{tile.hint}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bw-fade-up bw-rise-delay-2 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">Portfolio</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#0d2a28] sm:text-3xl">
              Your projects
            </h2>
            <p className="mt-1.5 text-sm text-[#5a6d68]">
              Detailed cards with lifecycle progress, freelancer name, and quick workspace links.
            </p>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0d2a28] transition hover:text-[var(--color-primary)]"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <QueryState isLoading={isLoading} isError={isError} error={error} data={data} isEmpty={false}>
          {(dashboard) =>
            dashboard.projects.length === 0 ? (
              <div className="flex flex-col items-center rounded-[28px] border border-dashed border-[#dce6e3] bg-white/90 px-6 py-20 text-center shadow-[0_16px_40px_rgba(13,42,40,0.04)]">
                <div className="bw-float-soft mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef8f6] text-[var(--color-primary)]">
                  <FolderKanban className="h-8 w-8" />
                </div>
                <p className="font-display text-xl font-semibold text-[#0d2a28]">No projects yet</p>
                <p className="mt-2 max-w-md text-sm text-[#5a6d68]">
                  Launch your first BuildWyse engagement and watch requirements, matching, and delivery unfold live.
                </p>
                <Link to="/projects?new=1" className="mt-6">
                  <Button className="h-11 rounded-xl bg-[#0d2a28] hover:bg-[#16403c]">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {dashboard.projects.map((project, index) => (
                  <ProjectPortfolioCard key={project.id} project={project} index={index} canDelete />
                ))}
              </div>
            )
          }
        </QueryState>
      </section>
    </div>
  )
}
