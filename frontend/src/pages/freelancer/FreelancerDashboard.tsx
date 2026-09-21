import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { freelancerService, projectService } from '@/services/projectService'
import type { FreelancerProfile, Project } from '@/types'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const STATUS_TONE: Record<string, 'default' | 'success' | 'secondary' | 'outline' | 'destructive'> = {
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  EXECUTION: 'default',
  MATCHING: 'secondary',
}

export function FreelancerDashboard() {
  const profileQuery = useQuery({
    queryKey: ['freelancer', 'me'],
    queryFn: () => freelancerService.me() as Promise<FreelancerProfile>,
  })
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
  })

  const projects = projectsQuery.data ?? []
  const active = projects.filter((p) => !['COMPLETED', 'CANCELLED'].includes(p.state)).length
  const featured = projects[0]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[#12352f] via-[#1a4d43] to-[#246b5c] px-6 py-8 text-white shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/90">BuildWyse Freelancer</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Delivery workspace</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/90">
              Proposals, tasks, submissions, verification, and payments — every record loads from saved project history.
            </p>
          </div>
          <Link to="/opportunities">
            <Button className="bg-white text-[#12352f] hover:bg-emerald-50">
              Browse opportunities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <QueryState isLoading={profileQuery.isLoading} isError={profileQuery.isError} error={profileQuery.error} data={profileQuery.data}>
          {(profile) => (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Your profile</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{profile.headline || 'Freelancer profile'}</h2>
                </div>
                <Badge variant={profile.platform_certified ? 'success' : 'outline'}>
                  {profile.platform_certified ? 'Platform certified' : 'Pending certification'}
                </Badge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label="Experience" value={`${profile.experience_years ?? 0} yrs`} />
                <Metric label="Availability" value={String(profile.availability_status ?? '—')} />
                <Metric label="Active projects" value={String(active)} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/portfolio"><Button variant="outline" size="sm">Portfolio</Button></Link>
                <Link to="/skills"><Button variant="outline" size="sm">Skills</Button></Link>
                <Link to="/certifications"><Button variant="outline" size="sm">Certifications</Button></Link>
              </div>
            </div>
          )}
        </QueryState>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {[
            { label: 'Assigned / visible projects', value: projects.length, icon: FolderKanban },
            { label: 'Active work', value: active, icon: Sparkles },
            { label: 'Open opportunities', value: 'Browse', icon: BriefcaseBusiness, to: '/opportunities' },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{tile.label}</p>
                <tile.icon className="h-4 w-4 text-[var(--color-primary)]" />
              </div>
              {'to' in tile && tile.to ? (
                <Link to={tile.to} className="mt-3 inline-flex items-center gap-2 font-display text-2xl font-semibold text-[var(--color-primary)]">
                  {tile.value}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <p className="mt-3 font-display text-2xl font-semibold">{tile.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {featured && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Continue delivery</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{featured.title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
                {featured.description || 'Open proposal, tasks, and verification from the project workspace.'}
              </p>
              <div className="mt-3"><Badge variant={STATUS_TONE[featured.state] ?? 'outline'}>{featured.state}</Badge></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/projects/${featured.id}/proposal`}><Button size="sm" variant="outline"><ClipboardList className="mr-2 h-4 w-4" />Proposal</Button></Link>
              <Link to={`/projects/${featured.id}/tasks`}><Button size="sm" variant="outline">Tasks</Button></Link>
              <Link to={`/projects/${featured.id}/verification`}><Button size="sm" variant="outline"><CheckCircle2 className="mr-2 h-4 w-4" />Verification</Button></Link>
              <Link to={`/projects/${featured.id}/proposal`}><Button size="sm">Open workspace<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your projects</h2>
          <Link to="/projects" className="text-sm text-[var(--color-primary)] hover:underline">View all</Link>
        </div>
        <QueryState isLoading={projectsQuery.isLoading} isError={projectsQuery.isError} error={projectsQuery.error} data={projectsQuery.data} emptyTitle="No projects yet" emptyDescription="Browse opportunities to engage with client projects.">
          {(items) => (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((p: Project) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}/proposal`}
                  className="group block rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold group-hover:text-[var(--color-primary)]">{p.title}</h3>
                    <Badge variant={STATUS_TONE[p.state] ?? 'outline'}>{p.state}</Badge>
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{p.description}</p>}
                  <div className="mt-5 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                    <span>Open delivery workspace</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </QueryState>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-muted)]/70 p-3">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  )
}
