import { formatState } from '@/components/client/SectionKit'
import { Spinner } from '@/components/ui/spinner'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { projectService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import type { Project } from '@/types'
import { cn } from '@/utils/cn'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'

const clientTabs: { to: string; label: string; end?: boolean }[] = [
  { to: '', label: 'Overview', end: true },
  { to: 'requirements', label: 'Requirements' },
  { to: 'documents', label: 'Documents' },
  { to: 'budget', label: 'Budget' },
  { to: 'matching', label: 'Matching' },
  { to: 'connect', label: 'Connect' },
  { to: 'calendar', label: 'Calendar' },
  { to: 'health', label: 'Health' },
  { to: 'changes', label: 'Changes' },
  { to: 'services', label: 'Services' },
  { to: 'payments', label: 'Payments' },
  { to: 'certificates', label: 'Certificates' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'settings', label: 'Settings' },
]

const freelancerTabs: { to: string; label: string; end?: boolean }[] = [
  { to: '', label: 'Overview', end: true },
  { to: 'proposal', label: 'Proposal' },
  { to: 'tasks', label: 'Tasks' },
  { to: 'milestones', label: 'Milestones' },
  { to: 'submissions', label: 'Submissions' },
  { to: 'evidence', label: 'Evidence' },
  { to: 'verification', label: 'Verification' },
  { to: 'connect', label: 'Connect' },
  { to: 'changes', label: 'Changes' },
  { to: 'services', label: 'Services' },
  { to: 'payments', label: 'Payments' },
  { to: 'history', label: 'History' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'settings', label: 'Settings' },
]

export function ProjectLayout() {
  const { id } = useParams<{ id: string }>()
  const roles = useAuthStore((s) => s.roles())
  const isFreelancer = roles.includes('FREELANCER') && !roles.includes('CLIENT')
  const tabs = isFreelancer ? freelancerTabs : clientTabs

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.get(id!) as Promise<Project>,
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError || !project) {
    return <p className="text-red-600">Project not found or access denied.</p>
  }

  const base = `/projects/${id}`

  return (
    <div className="relative space-y-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(26,92,85,0.1),_transparent_65%)]"
      />

      <div className="overflow-hidden rounded-2xl border border-[#dce6e3] bg-gradient-to-br from-[#0d2a28] via-[#16403c] to-[#1f6b63] text-white shadow-[0_16px_40px_rgba(13,42,40,0.14)]">
        <div className="relative flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100/80 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
          <h1 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{project.title}</h1>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-teal-50">
            {formatState(project.state)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-[#e2ebe8] bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(13,42,40,0.04)]">
        <div className="flex min-w-full gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to || 'overview'}
              to={tab.to ? `${base}/${tab.to}` : base}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[#0d2a28] text-white shadow-sm'
                    : 'text-[#5a6d68] hover:bg-[#f4f7f6] hover:text-[#0d2a28]',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet context={{ project }} />
    </div>
  )
}
