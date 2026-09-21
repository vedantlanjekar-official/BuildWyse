import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { projectService } from '@/services/projectService'
import type { Project, ProjectState } from '@/types'
import { cn } from '@/utils/cn'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  FileText,
  FolderKanban,
  HeartPulse,
  Layers,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const LIFECYCLE: ProjectState[] = [
  'DRAFT',
  'REQUIREMENTS',
  'DOCUMENTATION',
  'BUDGETING',
  'MATCHING',
  'FREELANCER_SELECTION',
  'CONTRACTING',
  'EXECUTION',
  'VERIFICATION',
  'COMPLETED',
]

function formatState(state: string) {
  return state.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatLabel(value: string | null | undefined) {
  if (!value) return null
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function complexityTone(complexity: string | null | undefined) {
  switch (complexity) {
    case 'low':
      return 'bg-[#e8f6f1] text-[#0f6b5c]'
    case 'medium':
      return 'bg-[#eef4ff] text-[#2f4f9b]'
    case 'high':
      return 'bg-[#fff4e8] text-[#9a5b12]'
    case 'enterprise':
      return 'bg-[#f3eef8] text-[#5b3d7a]'
    default:
      return 'bg-[#f4f7f6] text-[#5a6d68]'
  }
}

function stateTone(state: string) {
  if (state.includes('COMPLETE')) return 'bg-[#e8f6f1] text-[#0f6b5c] border-[#cfe9e0]'
  if (state.includes('CANCEL') || state.includes('HOLD')) return 'bg-[#f8ecec] text-[#8a3a3a] border-[#efd5d5]'
  if (state.includes('EXECUTION') || state.includes('VERIFICATION')) return 'bg-[#eef4ff] text-[#2f4f9b] border-[#d5e0f7]'
  if (state.includes('MATCH') || state.includes('SELECTION')) return 'bg-[#e8f6f1] text-[#0f6b5c] border-[#cfe9e0]'
  return 'bg-[#f4f7f6] text-[#3d524e] border-[#dce6e3]'
}

function progressFor(state: string) {
  if (state === 'CANCELLED') return 0
  if (state === 'ON_HOLD') {
    const idx = LIFECYCLE.indexOf('EXECUTION')
    return Math.round(((idx + 1) / LIFECYCLE.length) * 100)
  }
  const idx = LIFECYCLE.indexOf(state as ProjectState)
  if (idx < 0) {
    // Backend may use PROJECT_* style states
    const normalized = state.replace(/^PROJECT_/, '')
    const alt = LIFECYCLE.findIndex((s) => s === normalized || s.includes(normalized) || normalized.includes(s))
    if (alt >= 0) return Math.round(((alt + 1) / LIFECYCLE.length) * 100)
    return 8
  }
  return Math.round(((idx + 1) / LIFECYCLE.length) * 100)
}

export function ProjectPortfolioCard({
  project,
  index = 0,
  canDelete = false,
}: {
  project: Project
  index?: number
  canDelete?: boolean
}) {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const progress = progressFor(project.state)
  const budget =
    project.estimated_budget != null && project.estimated_budget !== ''
      ? `${project.currency || 'INR'} ${Number(project.estimated_budget).toLocaleString()}`
      : null

  const freelancerName = project.assigned_freelancer_name?.trim()
  const assignment = freelancerName
    ? freelancerName
    : project.assigned_freelancer_id
      ? 'Freelancer assigned'
      : project.assigned_org_id
        ? 'Organization assigned'
        : 'Awaiting assignment'

  const quickLinks = [
    { to: `/projects/${project.id}/requirements`, label: 'Requirements', icon: FileText },
    { to: `/projects/${project.id}/matching`, label: 'Matching', icon: Users },
    { to: `/projects/${project.id}/calendar`, label: 'Calendar', icon: CalendarDays },
    { to: `/projects/${project.id}/health`, label: 'Health', icon: HeartPulse },
  ]

  const deleteMutation = useMutation({
    mutationFn: () => projectService.delete(project.id),
    onSuccess: async () => {
      setConfirmOpen(false)
      queryClient.setQueryData<Project[]>(['projects'], (prev) =>
        (prev ?? []).filter((p) => p.id !== project.id),
      )
      queryClient.setQueryData(['client', 'dashboard'], (prev: unknown) => {
        if (!prev || typeof prev !== 'object') return prev
        const data = prev as { projects?: Project[]; [key: string]: unknown }
        if (!Array.isArray(data.projects)) return prev
        return { ...data, projects: data.projects.filter((p) => p.id !== project.id) }
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['client', 'dashboard'] }),
        queryClient.removeQueries({ queryKey: ['project', project.id] }),
      ])
    },
  })

  return (
    <>
      <article
        className="bw-fade-up group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[#dce6e3] bg-white/95 shadow-[0_18px_48px_rgba(13,42,40,0.07)] transition duration-500 hover:-translate-y-1.5 hover:border-[#0d2a28]/22 hover:shadow-[0_32px_70px_rgba(13,42,40,0.14)]"
        style={{ animationDelay: `${Math.min(index, 10) * 70}ms` }}
      >
        <div className="relative h-1.5 w-full overflow-hidden bg-[#e8eeec]">
          <div
            className="bw-shimmer absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(61,184,168,0.55),transparent)]"
            style={{ width: `${progress}%` }}
          />
          <div
            className="bw-progress-fill h-full bg-gradient-to-r from-[#0d2a28] via-[#1a5c55] to-[#3db8a8]"
            style={{ width: `${progress}%`, animationDelay: `${Math.min(index, 10) * 70 + 120}ms` }}
          />
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                {formatLabel(project.category) || 'Uncategorized'}
              </p>
              <Link to={`/projects/${project.id}`}>
                <h3 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-[#0d2a28] transition group-hover:text-[#16403c] sm:text-2xl">
                  {project.title}
                </h3>
              </Link>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]',
                  stateTone(project.state),
                )}
              >
                {formatState(project.state)}
              </span>
              {canDelete ? (
                <button
                  type="button"
                  aria-label={`Delete ${project.title}`}
                  className="rounded-full border border-[#efd5d5] bg-[#fdf6f6] p-1.5 text-[#8a3a3a] transition hover:bg-[#f8ecec]"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setConfirmOpen(true)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#5a6d68]">
            {project.description?.trim() || 'No description added yet.'}
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-[0.12em] text-[#8a9a96]">Lifecycle</span>
              <span className="font-semibold text-[#0d2a28]">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eef3f1]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0d2a28] to-[#3db8a8] transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#6b7c78]">
              Current stage: <span className="font-medium text-[#0d2a28]">{formatState(project.state)}</span>
            </p>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <MetaRow icon={Building2} label="Industry" value={formatLabel(project.industry) || '—'} />
            <MetaRow
              icon={Layers}
              label="Complexity"
              value={
                project.complexity ? (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                      complexityTone(project.complexity),
                    )}
                  >
                    {project.complexity}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <MetaRow icon={Wallet} label="Budget" value={budget || 'Not set'} />
            <MetaRow icon={FolderKanban} label="Model" value={formatLabel(project.development_model) || 'Not set'} />
            <MetaRow
              icon={UserRound}
              label="Freelancer"
              value={
                freelancerName ? (
                  <span className="font-semibold text-[#0d2a28]">{freelancerName}</span>
                ) : (
                  assignment
                )
              }
            />
            <MetaRow
              icon={Calendar}
              label="Created"
              value={new Date(project.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e2ebe8] bg-[#f7faf9] px-3 py-1.5 text-[11px] font-semibold text-[#3d524e] transition hover:border-[#0d2a28]/25 hover:bg-white hover:text-[#0d2a28]"
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#eef3f1] pt-4">
            <span className="text-xs text-[#8a9a96]">
              Updated{' '}
              {project.updated_at
                ? new Date(project.updated_at).toLocaleDateString()
                : new Date(project.created_at).toLocaleDateString()}
            </span>
            <Link
              to={`/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0d2a28] transition group-hover:gap-2"
            >
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </article>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete project?"
        description={`This permanently removes “${project.title}” and cannot be undone.`}
        className="rounded-3xl border-[#dce6e3]"
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setConfirmOpen(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-[#8a3a3a] hover:bg-[#6f2e2e]"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
        {deleteMutation.isError ? (
          <p className="mt-3 text-sm text-[#8a3a3a]">
            {(deleteMutation.error as Error)?.message || 'Could not delete this project.'}
          </p>
        ) : null}
      </Dialog>
    </>
  )
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-[#eef3f1] bg-[#fbfcfb] px-3 py-2.5 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a9a96]" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9a96]">{label}</p>
        <div className="mt-0.5 text-[#3d524e]">{value}</div>
      </div>
    </div>
  )
}
