import {
  SoftCard,
  MetricTile,
  ProgressRing,
  formatCurrency,
  formatDate,
  formatState,
} from '@/components/client/SectionKit'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { freelancerService, notificationService, projectService } from '@/services/projectService'
import type { Notification, Project } from '@/types'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  HeartPulse,
  Layers,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Row = Record<string, unknown>

const PIE_COLORS = ['#0d2a28', '#1a5c55', '#3db8a8', '#7dd3c7', '#c7e8e2']

function phaseProgress(status: string) {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('done')) return 100
  if (s.includes('progress') || s.includes('active')) return 55
  if (s.includes('review')) return 75
  if (s.includes('block')) return 20
  return 10
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()

  const results = useQueries({
    queries: [
      {
        queryKey: ['budgets', id],
        queryFn: () => projectService.listBudgets(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['phases', id],
        queryFn: () => projectService.phases(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['milestones', id],
        queryFn: () => projectService.listMilestones(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['matching-results', id],
        queryFn: () => projectService.getMatchingResults(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['health', id],
        queryFn: () => projectService.health(id!) as Promise<Row>,
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['calendar', id],
        queryFn: () => projectService.calendar(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['payments', id],
        queryFn: () => projectService.listPayments(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['requirements', id],
        queryFn: () => projectService.requirements(id!),
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['project', id, 'documents'],
        queryFn: () => projectService.documents(id!) as Promise<Row[]>,
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
      {
        queryKey: ['changes', id],
        queryFn: () => projectService.changes(id!) as Promise<Row[]>,
        enabled: !!id,
        refetchInterval: PROJECT_LIVE_MS,
      },
    ],
  })

  const [
    budgetsQ,
    phasesQ,
    milestonesQ,
    matchingQ,
    healthQ,
    calendarQ,
    paymentsQ,
    requirementsQ,
    documentsQ,
    changesQ,
  ] = results

  const freelancerQuery = useQuery({
    queryKey: ['freelancer', project.assigned_freelancer_id],
    queryFn: () => freelancerService.get(project.assigned_freelancer_id!) as Promise<Row>,
    enabled: Boolean(project.assigned_freelancer_id),
    refetchInterval: PROJECT_LIVE_MS,
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list() as Promise<Notification[]>,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const budgets = (budgetsQ.data ?? []) as Row[]
  const phases = (phasesQ.data ?? []) as Row[]
  const milestones = (milestonesQ.data ?? []) as Row[]
  const payments = (
    Array.isArray(paymentsQ.data)
      ? paymentsQ.data
      : ((paymentsQ.data as { orders?: Row[] } | undefined)?.orders ?? [])
  ) as Row[]
  const requirements = requirementsQ.data ?? []
  const documents = (documentsQ.data ?? []) as Row[]
  const changes = (changesQ.data ?? []) as Row[]
  const calendar = (calendarQ.data ?? []) as Row[]
  const candidates = (matchingQ.data?.candidates ?? []) as Row[]
  const health = (healthQ.data ?? {}) as Row
  const freelancer = freelancerQuery.data

  const selectedBudget = useMemo(() => {
    if (!budgets.length) return null
    if (project.development_model) {
      return budgets.find((b) => String(b.budget_type) === project.development_model) ?? budgets[0]
    }
    return budgets[0]
  }, [budgets, project.development_model])

  const healthScore = Number(health.overall_score ?? health.score ?? health.health_score ?? 0)
  const reqApproved = requirements.filter((r) => ['approved', 'confirmed'].includes(r.status)).length
  const phaseDone = phases.filter((p) => phaseProgress(String(p.status ?? '')) >= 100).length
  const phasePct = phases.length ? Math.round((phaseDone / phases.length) * 100) : 0

  const budgetChart = budgets.map((b) => ({
    name: String(b.budget_type ?? 'model').replaceAll('_', ' '),
    min: Number(b.min_amount ?? b.amount ?? 0),
    max: Number(b.max_amount ?? b.amount ?? 0),
  }))

  const progressSeries = useMemo(() => {
    const points = phases
      .slice()
      .sort((a, b) => Number(a.phase_number ?? a.order_index ?? 0) - Number(b.phase_number ?? b.order_index ?? 0))
      .map((p, i) => ({
        name: String(p.name ?? `Phase ${i + 1}`).slice(0, 12),
        progress: phaseProgress(String(p.status ?? '')),
      }))
    if (points.length) return points
    return [
      { name: 'Discover', progress: project.state.includes('DISCOVERY') || project.state.includes('REQUIRE') ? 40 : 80 },
      { name: 'Docs', progress: documents.length ? 70 : 20 },
      { name: 'Budget', progress: budgets.length ? 85 : 15 },
      { name: 'Match', progress: candidates.length ? 75 : 10 },
      { name: 'Build', progress: phasePct || 5 },
    ]
  }, [phases, project.state, documents.length, budgets.length, candidates.length, phasePct])

  const completionSlices = [
    { name: 'Requirements', value: Math.max(reqApproved, 1) },
    { name: 'Documents', value: Math.max(documents.length, 1) },
    { name: 'Phases', value: Math.max(phaseDone, 1) },
    { name: 'Payments', value: Math.max(payments.length, 1) },
  ]

  const updates = useMemo(() => {
    const fromNotes = (notificationsQuery.data ?? [])
      .filter((n) => !n.project_id || n.project_id === id)
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        at: n.created_at,
        tone: 'teal' as const,
      }))

    const fromChanges = changes.slice(0, 6).map((c) => ({
      id: String(c.id),
      title: String(c.title ?? 'Change request'),
      body: String(c.description ?? c.status ?? ''),
      at: String(c.created_at ?? ''),
      tone: 'amber' as const,
    }))

    const fromPayments = payments.slice(0, 4).map((p) => ({
      id: `pay-${String(p.id)}`,
      title: `Payment ${String(p.status ?? 'update')}`,
      body: formatCurrency(p.amount ?? p.total_amount, String(p.currency ?? project.currency)),
      at: String(p.created_at ?? ''),
      tone: 'blue' as const,
    }))

    return [...fromNotes, ...fromChanges, ...fromPayments]
      .filter((u) => u.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8)
  }, [notificationsQuery.data, changes, payments, id, project.currency])

  const selectedCandidate = candidates.find(
    (c) => String(c.freelancer_id) === project.assigned_freelancer_id || String(c.user_id) === project.assigned_freelancer_id,
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Finalized budget"
          value={
            selectedBudget
              ? formatCurrency(selectedBudget.min_amount ?? selectedBudget.amount, String(selectedBudget.currency ?? project.currency))
              : project.estimated_budget
                ? formatCurrency(project.estimated_budget, project.currency)
                : '—'
          }
          hint={project.development_model ? `Model: ${project.development_model}` : 'No model selected yet'}
          icon={<Wallet className="h-5 w-5" />}
          tone="teal"
        />
        <MetricTile
          label="Health score"
          value={healthScore ? `${Math.round(healthScore)}%` : '—'}
          hint="From live project health"
          icon={<HeartPulse className="h-5 w-5" />}
          tone="rose"
        />
        <MetricTile
          label="Phases"
          value={`${phaseDone}/${phases.length || 0}`}
          hint={phases.length ? `${phasePct}% complete` : 'Phases not created yet'}
          icon={<Layers className="h-5 w-5" />}
          tone="blue"
        />
        <MetricTile
          label="Requirements"
          value={`${reqApproved}/${requirements.length}`}
          hint={`${documents.length} documents saved`}
          icon={<FolderKanban className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SoftCard title="Delivery progress" subtitle="Phase / workflow momentum" className="xl:col-span-2" accent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressSeries}>
                <defs>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a5c55" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1a5c55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8a9a96' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8a9a96' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="progress" stroke="#0d2a28" strokeWidth={2.5} fill="url(#progressFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SoftCard>

        <SoftCard title="Completion mix" subtitle="Saved workstreams">
          <div className="relative mx-auto h-52 w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={completionSlices} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3}>
                  {completionSlices.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-3xl font-semibold text-[#0d2a28]">{phasePct || reqApproved * 10}%</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">Pulse</p>
            </div>
          </div>
        </SoftCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SoftCard title="Project details" subtitle="Core engagement facts">
          <dl className="space-y-3 text-sm">
            <DetailRow label="State" value={formatState(project.state)} />
            <DetailRow label="Category" value={project.category?.replaceAll('_', ' ') || '—'} />
            <DetailRow label="Industry" value={project.industry || '—'} />
            <DetailRow label="Complexity" value={project.complexity || '—'} />
            <DetailRow label="Dev model" value={project.development_model || '—'} />
            <DetailRow label="Created" value={formatDate(project.created_at)} />
            <DetailRow label="Updated" value={formatDate(project.updated_at)} />
          </dl>
        </SoftCard>

        <SoftCard
          title="Selected talent"
          subtitle="Assigned freelancer"
          action={
            <Link to={`/projects/${id}/matching`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Matching
            </Link>
          }
        >
          {project.assigned_freelancer_id ? (
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0d2a28] to-[#3db8a8] text-lg font-semibold text-white">
                {String(freelancer?.headline ?? 'F').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#0d2a28]">
                  {String(
                    freelancer?.full_name ??
                      freelancer?.headline ??
                      selectedCandidate?.headline ??
                      'Assigned freelancer',
                  )}
                </p>
                <p className="mt-1 text-xs text-[#6b7c78]">
                  {freelancer?.experience_years != null ? `${freelancer.experience_years} yrs experience · ` : ''}
                  {String(freelancer?.availability_status ?? 'Available')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {freelancer?.platform_certified ? (
                    <span className="rounded-full bg-[#e8f6f1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0f6b5c]">
                      Certified
                    </span>
                  ) : null}
                  {selectedCandidate?.overall_score != null ? (
                    <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2f4f9b]">
                      Score {Math.round(Number(selectedCandidate.overall_score))}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-[#5a6d68]">
                  {String(selectedCandidate?.explanation ?? 'Selected through BuildWyse matching and saved on this project.')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f7f6] text-[#8a9a96]">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-[#0d2a28]">No freelancer selected yet</p>
                <p className="mt-1 text-sm text-[#6b7c78]">Run matching and choose a candidate — selection is saved permanently.</p>
              </div>
              <Link
                to={`/projects/${id}/matching`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]"
              >
                Open matching <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </SoftCard>

        <SoftCard
          title="Finalized budget"
          subtitle="Preferred development model"
          action={
            <Link to={`/projects/${id}/budget`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Budget
            </Link>
          }
        >
          {selectedBudget ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">
                  {String(selectedBudget.budget_type ?? project.development_model ?? 'Estimate')}
                </p>
                <p className="mt-1 font-display text-3xl font-semibold text-[#0d2a28]">
                  {formatCurrency(selectedBudget.min_amount ?? selectedBudget.amount, String(selectedBudget.currency ?? 'INR'))}
                  {selectedBudget.max_amount != null ? (
                    <span className="text-lg text-[#6b7c78]">
                      {' '}
                      – {formatCurrency(selectedBudget.max_amount, String(selectedBudget.currency ?? 'INR'))}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetChart}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a9a96' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="min" fill="#1a5c55" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyHint
              icon={<Banknote className="h-5 w-5" />}
              title="No budget saved"
              body="Generate and select a development model — it stays on this project."
              to={`/projects/${id}/budget`}
              cta="Open budget"
            />
          )}
        </SoftCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <SoftCard
          title="Project phases"
          subtitle={`${phases.length} phases · ${milestones.length} milestones`}
          className="xl:col-span-3"
          action={
            <Link to={`/projects/${id}/calendar`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Calendar
            </Link>
          }
        >
          {phases.length === 0 ? (
            <EmptyHint
              icon={<Layers className="h-5 w-5" />}
              title="No phases yet"
              body="Phases appear here once created for delivery planning."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eef3f1] text-[11px] uppercase tracking-[0.12em] text-[#8a9a96]">
                    <th className="pb-3 font-semibold">Phase</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Progress</th>
                    <th className="pb-3 font-semibold">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {phases
                    .slice()
                    .sort(
                      (a, b) =>
                        Number(a.phase_number ?? a.order_index ?? 0) - Number(b.phase_number ?? b.order_index ?? 0),
                    )
                    .map((phase) => {
                      const pct = phaseProgress(String(phase.status ?? ''))
                      return (
                        <tr key={String(phase.id)} className="border-b border-[#f3f7f6] last:border-0">
                          <td className="py-3.5">
                            <p className="font-semibold text-[#0d2a28]">{String(phase.name ?? 'Phase')}</p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-[#8a9a96]">
                              {String(phase.description ?? '') || `Phase ${String(phase.phase_number ?? '')}`}
                            </p>
                          </td>
                          <td className="py-3.5">
                            <span className="rounded-full bg-[#f4f7f6] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#3d524e]">
                              {String(phase.status ?? 'planned').replaceAll('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e8eeec]">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#0d2a28] to-[#3db8a8]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-[#6b7c78]">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-xs text-[#6b7c78]">
                            {String(phase.planned_start_date ?? '').slice(0, 10) || '—'}
                            {' → '}
                            {String(phase.planned_end_date ?? '').slice(0, 10) || '—'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </SoftCard>

        <SoftCard title="Updates" subtitle="Saved activity & alerts" className="xl:col-span-2">
          {updates.length === 0 ? (
            <EmptyHint icon={<Activity className="h-5 w-5" />} title="No updates yet" body="Changes, payments, and notifications will stream here live." />
          ) : (
            <ul className="space-y-0">
              {updates.map((item, index) => (
                <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < updates.length - 1 ? (
                    <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-[#e5ecea]" />
                  ) : null}
                  <span
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      item.tone === 'amber'
                        ? 'bg-[#fff4e8] text-[#9a5b12]'
                        : item.tone === 'blue'
                          ? 'bg-[#eef4ff] text-[#2f4f9b]'
                          : 'bg-[#e8f6f1] text-[#0f6b5c]'
                    }`}
                  >
                    {item.tone === 'amber' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : item.tone === 'blue' ? (
                      <Wallet className="h-3.5 w-3.5" />
                    ) : (
                      <Activity className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0d2a28]">{item.title}</p>
                      <span className="shrink-0 text-[11px] text-[#8a9a96]">{formatDate(item.at)}</span>
                    </div>
                    {item.body ? <p className="mt-0.5 line-clamp-2 text-xs text-[#6b7c78]">{item.body}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SoftCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Milestones"
          value={String(milestones.length)}
          ring={milestones.length ? Math.min(100, milestones.length * 20) : 8}
          to={`/projects/${id}/calendar`}
        />
        <MiniStat
          label="Calendar events"
          value={String(calendar.length)}
          ring={calendar.length ? Math.min(100, calendar.length * 15) : 8}
          to={`/projects/${id}/calendar`}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />
        <MiniStat
          label="Payments"
          value={String(payments.length)}
          ring={payments.length ? Math.min(100, payments.length * 25) : 8}
          to={`/projects/${id}/payments`}
        />
        <MiniStat
          label="Change requests"
          value={String(changes.length)}
          ring={changes.length ? Math.min(100, changes.length * 20) : 8}
          to={`/projects/${id}/changes`}
        />
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#8a9a96]">{label}</dt>
      <dd className="text-right font-medium capitalize text-[#0d2a28]">{value}</dd>
    </div>
  )
}

function EmptyHint({
  icon,
  title,
  body,
  to,
  cta,
}: {
  icon: ReactNode
  title: string
  body: string
  to?: string
  cta?: string
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-2">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f7f6] text-[#8a9a96]">{icon}</div>
      <div>
        <p className="font-medium text-[#0d2a28]">{title}</p>
        <p className="mt-1 text-sm text-[#6b7c78]">{body}</p>
      </div>
      {to && cta ? (
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

function MiniStat({
  label,
  value,
  ring,
  to,
  icon,
}: {
  label: string
  value: string
  ring: number
  to: string
  icon?: ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-[22px] border border-[#e2ebe8] bg-white p-4 shadow-[0_10px_30px_rgba(13,42,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(13,42,40,0.08)]"
    >
      <div className="relative">
        <ProgressRing value={ring} size={52} stroke={5} />
        {icon ? <span className="absolute inset-0 flex items-center justify-center text-[#1a5c55]">{icon}</span> : null}
      </div>
      <div>
        <p className="font-display text-2xl font-semibold text-[#0d2a28]">{value}</p>
        <p className="text-xs text-[#6b7c78]">{label}</p>
      </div>
    </Link>
  )
}
