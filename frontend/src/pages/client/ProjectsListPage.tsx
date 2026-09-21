import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { ProjectPortfolioCard } from '@/components/projects/ProjectPortfolioCard'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { projectService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import type { Project } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, Layers, Plus, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

function formatState(state: string) {
  return state.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ProjectsListPage() {
  const roles = useAuthStore((s) => s.roles())
  const isClient = roles.includes('CLIENT')
  const [searchParams, setSearchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
    refetchInterval: PROJECT_LIVE_MS,
  })

  useEffect(() => {
    if (searchParams.get('new') === '1' && isClient) {
      setCreateOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, isClient])

  const projects = data ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      if (stateFilter !== 'all' && p.state !== stateFilter) return false
      if (!q) return true
      const haystack = [
        p.title,
        p.description,
        p.category,
        p.industry,
        p.complexity,
        p.state,
        p.assigned_freelancer_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [projects, query, stateFilter])

  const states = useMemo(() => {
    const unique = Array.from(new Set(projects.map((p) => p.state)))
    return unique.sort()
  }, [projects])

  const stats = useMemo(() => {
    const active = projects.filter((p) => !['COMPLETED', 'CANCELLED', 'ON_HOLD'].includes(p.state)).length
    const completed = projects.filter((p) => p.state === 'COMPLETED' || p.state.includes('COMPLETE')).length
    return {
      total: projects.length,
      active,
      completed,
    }
  }, [projects])

  const openCreate = () => setCreateOpen(true)

  return (
    <div className="relative space-y-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(26,92,85,0.12),_transparent_60%)]"
      />

      <section className="overflow-hidden rounded-[28px] border border-[#dce6e3] bg-gradient-to-br from-[#0d2a28] via-[#16403c] to-[#1f6b63] text-white shadow-[0_24px_60px_rgba(13,42,40,0.18)]">
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100/80">Workspace</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
              <p className="mt-3 text-sm leading-relaxed text-teal-50/85">
                Every engagement in one gallery — status, freelancer, budget, and lifecycle at a glance.
              </p>
            </div>
            {isClient ? (
              <Button onClick={openCreate} className="h-11 rounded-xl bg-white text-[#0d2a28] hover:bg-teal-50">
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Button>
            ) : null}
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Total', value: stats.total, icon: FolderKanban },
              { label: 'Active', value: stats.active, icon: Sparkles },
              { label: 'Completed', value: stats.completed, icon: Layers },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100/75">{item.label}</p>
                  <item.icon className="h-4 w-4 text-teal-100/80" />
                </div>
                <p className="mt-2 font-display text-2xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a96]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, freelancer, industry…"
            className="h-11 rounded-xl border-[#dce6e3] bg-white/90 pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={stateFilter === 'all'} onClick={() => setStateFilter('all')}>
            All
          </FilterChip>
          {states.map((state) => (
            <FilterChip key={state} active={stateFilter === state} onClick={() => setStateFilter(state)}>
              {formatState(state)}
            </FilterChip>
          ))}
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={filtered}
        isEmpty={filtered.length === 0}
        emptyTitle={projects.length === 0 ? 'No projects yet' : 'No matching projects'}
        emptyDescription={
          projects.length === 0
            ? 'Create your first project to begin discovery, requirements, and delivery.'
            : 'Try a different search or clear the status filter.'
        }
        emptyAction={
          isClient && projects.length === 0 ? (
            <Button onClick={openCreate} className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          ) : null
        }
      >
        {(list) => (
          <div className="grid gap-5 lg:grid-cols-2">
            {list.map((project: Project, index: number) => (
              <ProjectPortfolioCard key={project.id} project={project} index={index} canDelete={isClient} />
            ))}
          </div>
        )}
      </QueryState>

      {isClient ? <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-[#0d2a28] text-white shadow-sm'
          : 'border border-[#dce6e3] bg-white text-[#3d524e] hover:border-[#0d2a28]/30'
      }`}
    >
      {children}
    </button>
  )
}
