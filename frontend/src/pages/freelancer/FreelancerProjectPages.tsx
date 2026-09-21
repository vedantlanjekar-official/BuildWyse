import {
  DetailDialog,
  DocumentSheet,
  InteractiveCard,
  MetricTile,
  RegenerateButton,
  SectionHeader,
  StatePanel,
  formatCurrency,
  formatDate,
} from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Flag,
  History,
  Paperclip,
  Send,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

type Row = Record<string, unknown>

export function FreelancerProposalPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: 'Technical Proposal',
    proposed_solution: '',
    technical_perspective: '',
    project_understanding: '',
    timeline_estimate_days: '21',
    proposed_amount: '',
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['proposals', id],
    queryFn: () => projectService.proposals(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      projectService.submitProposal({
        project_id: id,
        title: form.title,
        proposed_solution: form.proposed_solution,
        technical_perspective: form.technical_perspective,
        project_understanding: form.project_understanding,
        timeline_estimate_days: Number(form.timeline_estimate_days) || 21,
        proposed_amount: form.proposed_amount ? Number(form.proposed_amount) : undefined,
      }),
    onSuccess: () => {
      setShowForm(false)
      void queryClient.invalidateQueries({ queryKey: ['proposals', id] })
    },
  })

  const proposals = data ?? []
  const latest = proposals[0]
  const hasSaved = proposals.length > 0

  return (
    <div>
      <SectionHeader
        live
        title="Technical proposal"
        description="Saved proposals reload automatically. Submit once; revise only when you choose to."
        saved={hasSaved}
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close form' : hasSaved ? 'Submit revision' : 'Write proposal'}
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Proposal title" />
          <Textarea rows={3} placeholder="Project understanding…" value={form.project_understanding} onChange={(e) => setForm((f) => ({ ...f, project_understanding: e.target.value }))} />
          <Textarea rows={3} placeholder="Proposed solution…" value={form.proposed_solution} onChange={(e) => setForm((f) => ({ ...f, proposed_solution: e.target.value }))} />
          <Textarea rows={3} placeholder="Technical perspective…" value={form.technical_perspective} onChange={(e) => setForm((f) => ({ ...f, technical_perspective: e.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="number" placeholder="Timeline (days)" value={form.timeline_estimate_days} onChange={(e) => setForm((f) => ({ ...f, timeline_estimate_days: e.target.value }))} />
            <Input type="number" placeholder="Proposed amount (INR)" value={form.proposed_amount} onChange={(e) => setForm((f) => ({ ...f, proposed_amount: e.target.value }))} />
          </div>
          {submitMutation.isError && <Alert variant="destructive">{(submitMutation.error as Error).message}</Alert>}
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={
              submitMutation.isPending ||
              form.proposed_solution.trim().length < 10 ||
              form.technical_perspective.trim().length < 10 ||
              form.project_understanding.trim().length < 10
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {submitMutation.isPending ? 'Submitting…' : 'Submit proposal'}
          </Button>
        </div>
      )}

      <StatePanel
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={!hasSaved}
        emptyTitle="No proposal saved yet"
        emptyDescription={`Write and submit your approach for “${project.title}”.`}
        emptyAction={<Button onClick={() => setShowForm(true)}>Write proposal</Button>}
      >
        {latest && (
          <DocumentSheet title={String(latest.title ?? 'Technical Proposal')} subtitle={`${project.title} · ${formatDate(String(latest.submitted_at ?? latest.created_at ?? ''))}`}>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{String(latest.status)}</Badge>
              {latest.timeline_estimate_days != null && <Badge variant="outline">{String(latest.timeline_estimate_days)} days</Badge>}
              {latest.proposed_amount != null && <Badge variant="secondary">{formatCurrency(latest.proposed_amount)}</Badge>}
            </div>
            <section>
              <h4 className="mb-2 font-semibold">Understanding</h4>
              <p className="whitespace-pre-wrap text-[var(--color-muted-foreground)]">{String(latest.project_understanding ?? '')}</p>
            </section>
            <section>
              <h4 className="mb-2 font-semibold">Solution</h4>
              <p className="whitespace-pre-wrap text-[var(--color-muted-foreground)]">{String(latest.proposed_solution ?? latest.approach_summary ?? '')}</p>
            </section>
            <section>
              <h4 className="mb-2 font-semibold">Technical perspective</h4>
              <p className="whitespace-pre-wrap text-[var(--color-muted-foreground)]">{String(latest.technical_perspective ?? '')}</p>
            </section>
            {proposals.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Previous submissions</p>
                {proposals.slice(1).map((p) => (
                  <InteractiveCard key={String(p.id)} onClick={() => setSelected(p)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{String(p.title ?? 'Proposal')}</p>
                      <Badge variant="outline">{String(p.status)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{formatDate(String(p.submitted_at ?? p.created_at ?? ''))}</p>
                  </InteractiveCard>
                ))}
              </div>
            )}
          </DocumentSheet>
        )}
      </StatePanel>

      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={String(selected?.title ?? 'Proposal')}>
        {selected && (
          <p className="whitespace-pre-wrap text-sm text-[var(--color-muted-foreground)]">
            {String(selected.approach_summary ?? selected.proposed_solution ?? '')}
          </p>
        )}
      </DetailDialog>
    </div>
  )
}

export function FreelancerTasksPage() {
  const { id } = useParams<{ id: string }>()
  const [selected, setSelected] = useState<Row | null>(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => projectService.listTasks(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })
  const tasks = data ?? []

  return (
    <div>
      <SectionHeader
        title="Tasks"
        description="Execution tasks saved for this project. Revisit anytime — nothing regenerates on load."
      />
      <StatePanel isLoading={isLoading} isError={isError} error={error as Error | null} isEmpty={tasks.length === 0} emptyTitle="No tasks yet" emptyDescription="Tasks appear once phases are planned and work is assigned.">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Total" value={tasks.length} />
          <MetricTile label="In progress" value={tasks.filter((t) => String(t.status) === 'in_progress').length} />
          <MetricTile label="Done" value={tasks.filter((t) => ['done', 'completed'].includes(String(t.status))).length} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <InteractiveCard key={String(task.id)} onClick={() => setSelected(task)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]"><ClipboardList className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{String(task.title)}</p>
                    <Badge variant="outline">{String(task.status)}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{String(task.description ?? 'Open for details')}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">Due {formatDate(String(task.due_date ?? ''))}</p>
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={String(selected?.title ?? 'Task')}>
        {selected && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{String(selected.status)}</Badge>
            <p className="leading-relaxed">{String(selected.description ?? 'No description')}</p>
            <p className="text-[var(--color-muted-foreground)]">Priority: {String(selected.priority ?? '—')}</p>
            <p className="text-[var(--color-muted-foreground)]">Due: {formatDate(String(selected.due_date ?? ''))}</p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

export function FreelancerMilestonesPage() {
  const { id } = useParams<{ id: string }>()
  const [selected, setSelected] = useState<Row | null>(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => projectService.listMilestones(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })
  const milestones = data ?? []

  return (
    <div>
      <SectionHeader title="Milestones" description="Payment and delivery checkpoints persisted for this engagement." />
      <StatePanel isLoading={isLoading} isError={isError} error={error as Error | null} isEmpty={milestones.length === 0} emptyTitle="No milestones yet" emptyDescription="Milestones will appear after project planning.">
        <div className="grid gap-3 md:grid-cols-2">
          {milestones.map((m) => (
            <InteractiveCard key={String(m.id)} onClick={() => setSelected(m)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]"><Flag className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{String(m.title)}</p>
                    <Badge variant="outline">{String(m.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{formatDate(String(m.due_date ?? ''))}</p>
                  {m.payment_amount != null && <p className="mt-1 text-sm font-medium">{formatCurrency(m.payment_amount)}</p>}
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={String(selected?.title ?? 'Milestone')}>
        {selected && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{String(selected.status)}</Badge>
            <p>{String(selected.description ?? 'No description')}</p>
            <p className="text-[var(--color-muted-foreground)]">Due: {formatDate(String(selected.due_date ?? ''))}</p>
            <p className="text-[var(--color-muted-foreground)]">Payment: {selected.payment_amount != null ? formatCurrency(selected.payment_amount) : '—'}</p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

export function FreelancerSubmissionsPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Row | null>(null)
  const [notes, setNotes] = useState('')
  const [phaseId, setPhaseId] = useState('')
  const [showForm, setShowForm] = useState(false)

  const phasesQuery = useQuery({
    queryKey: ['phases', id],
    queryFn: () => projectService.phases(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => projectService.listSubmissions(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const createMutation = useMutation({
    mutationFn: () => projectService.createSubmission(phaseId, { submission_notes: notes }),
    onSuccess: () => {
      setNotes('')
      setShowForm(false)
      void queryClient.invalidateQueries({ queryKey: ['submissions', id] })
      void queryClient.invalidateQueries({ queryKey: ['phases', id] })
    },
  })

  const submissions = data ?? []
  const phases = phasesQuery.data ?? []

  return (
    <div>
      <SectionHeader
        live
        title="Submissions"
        description="Phase deliverables you have submitted. History loads from the database on every visit."
        saved={submissions.length > 0}
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'New submission'}</Button>}
      />
      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <select className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm" value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
            <option value="">Select phase</option>
            {phases.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.id)}</option>
            ))}
          </select>
          <Textarea rows={4} placeholder="Submission notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {createMutation.isError && <Alert variant="destructive">{(createMutation.error as Error).message}</Alert>}
          <Button onClick={() => createMutation.mutate()} disabled={!phaseId || createMutation.isPending}>
            {createMutation.isPending ? 'Submitting…' : 'Submit phase'}
          </Button>
        </div>
      )}
      <StatePanel isLoading={isLoading} isError={isError} error={error as Error | null} isEmpty={submissions.length === 0} emptyTitle="No submissions saved" emptyDescription="Submit a phase deliverable to create a lasting review record.">
        <div className="grid gap-3 md:grid-cols-2">
          {submissions.map((s) => (
            <InteractiveCard key={String(s.id)} onClick={() => setSelected(s)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]"><FileCheck2 className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">Submission</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{String(s.submission_notes ?? 'No notes')}</p>
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{formatDate(String(s.submitted_at ?? ''))}</p>
                  </div>
                </div>
                <Badge variant="outline">{String(s.status)}</Badge>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title="Submission details">
        {selected && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{String(selected.status)}</Badge>
            <p className="leading-relaxed">{String(selected.submission_notes ?? '')}</p>
            <p className="text-[var(--color-muted-foreground)]">Submitted {formatDate(String(selected.submitted_at ?? ''))}</p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

export function FreelancerEvidencePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ submission_id: '', title: '', evidence_type: 'link', url: '', description: '' })

  const submissionsQuery = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => projectService.listSubmissions(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['evidence', id],
    queryFn: () => projectService.listEvidence(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      projectService.addEvidence(form.submission_id, {
        title: form.title,
        evidence_type: form.evidence_type,
        url: form.url || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      setShowForm(false)
      setForm({ submission_id: '', title: '', evidence_type: 'link', url: '', description: '' })
      void queryClient.invalidateQueries({ queryKey: ['evidence', id] })
    },
  })

  const evidence = data ?? []

  return (
    <div>
      <SectionHeader live title="Evidence" description="Proof artifacts attached to submissions. Saved items reload without regeneration." saved={evidence.length > 0} actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add evidence'}</Button>} />
      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <select className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm" value={form.submission_id} onChange={(e) => setForm((f) => ({ ...f, submission_id: e.target.value }))}>
            <option value="">Select submission</option>
            {(submissionsQuery.data ?? []).map((s) => (
              <option key={String(s.id)} value={String(s.id)}>{String(s.id).slice(0, 8)} · {String(s.status)}</option>
            ))}
          </select>
          <Input placeholder="Evidence title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input placeholder="URL (optional)" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          <Textarea rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          {createMutation.isError && <Alert variant="destructive">{(createMutation.error as Error).message}</Alert>}
          <Button onClick={() => createMutation.mutate()} disabled={!form.submission_id || form.title.trim().length < 2 || createMutation.isPending}>
            {createMutation.isPending ? 'Saving…' : 'Save evidence'}
          </Button>
        </div>
      )}
      <StatePanel isLoading={isLoading} isError={isError} error={error as Error | null} isEmpty={evidence.length === 0} emptyTitle="No evidence saved" emptyDescription="Attach links, repos, or artifacts to support your submissions.">
        <div className="grid gap-3 md:grid-cols-2">
          {evidence.map((item) => (
            <InteractiveCard key={String(item.id)} onClick={() => setSelected(item)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]"><Paperclip className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">{String(item.title)}</p>
                  <Badge className="mt-2" variant="outline">{String(item.evidence_type)}</Badge>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{String(item.description ?? item.url ?? '')}</p>
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={String(selected?.title ?? 'Evidence')}>
        {selected && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{String(selected.evidence_type)}</Badge>
            <p>{String(selected.description ?? '')}</p>
            {selected.url != null && <a className="text-[var(--color-primary)] underline" href={String(selected.url)} target="_blank" rel="noreferrer">{String(selected.url)}</a>}
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

export function FreelancerVerificationPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Row | null>(null)

  const submissionsQuery = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => projectService.listSubmissions(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['verifications', id],
    queryFn: () => projectService.listVerifications(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const verifyMutation = useMutation({
    mutationFn: (submissionId: string) => projectService.verifySubmission(submissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['verifications', id] }),
  })

  const reports = data ?? []
  const submissions = submissionsQuery.data ?? []

  return (
    <div>
      <SectionHeader
        live
        title="Verification"
        description="AI verification reports are stored and reloaded. Run verification only when you need a new report."
        saved={reports.length > 0}
        actions={
          submissions[0] ? (
            reports.length > 0 ? (
              <RegenerateButton label="Verify latest submission" pending={verifyMutation.isPending} onClick={() => verifyMutation.mutate(String(submissions[0].id))} />
            ) : (
              <Button onClick={() => verifyMutation.mutate(String(submissions[0].id))} disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? 'Verifying…' : 'Run verification'}
              </Button>
            )
          ) : undefined
        }
      />
      {verifyMutation.isError && <Alert variant="destructive" className="mb-4">{(verifyMutation.error as Error).message}</Alert>}
      <StatePanel isLoading={isLoading} isError={isError} error={error as Error | null} isEmpty={reports.length === 0} emptyTitle="No verification reports saved" emptyDescription="Submit work first, then run AI verification to create a persisted report." emptyAction={submissions[0] ? <Button onClick={() => verifyMutation.mutate(String(submissions[0].id))} disabled={verifyMutation.isPending}>Run verification</Button> : undefined}>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Reports" value={reports.length} />
          <MetricTile label="Passed" value={reports.filter((r) => String(r.overall_result) === 'pass').length} />
          <MetricTile label="Latest score" value={reports[0]?.compliance_score != null ? Math.round(Number(reports[0].compliance_score)) : '—'} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((r) => (
            <InteractiveCard key={String(r.id)} onClick={() => setSelected(r)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]"><CheckCircle2 className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold capitalize">{String(r.overall_result)} verification</p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{formatDate(String(r.created_at ?? ''))}</p>
                  </div>
                </div>
                <Badge variant={String(r.overall_result) === 'pass' ? 'success' : 'outline'}>
                  {r.compliance_score != null ? `${Math.round(Number(r.compliance_score))}%` : String(r.overall_result)}
                </Badge>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title="Verification report">
        {selected && (
          <div className="space-y-3 text-sm">
            <Badge variant="outline">{String(selected.overall_result)}</Badge>
            <p>Score: {selected.compliance_score != null ? Math.round(Number(selected.compliance_score)) : '—'}</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted-foreground)]">
              {(Array.isArray(selected.findings) ? selected.findings : []).slice(0, 12).map((f, i) => (
                <li key={i}>{typeof f === 'string' ? f : String((f as Row).summary ?? (f as Row).message ?? JSON.stringify(f).slice(0, 120))}</li>
              ))}
            </ul>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

export function FreelancerHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [selected, setSelected] = useState<Row | null>(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['phases', id],
    queryFn: () => projectService.phases(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })
  const phases = useMemo(() => {
    const rows = [...(data ?? [])]
    rows.sort((a, b) => Number(a.phase_number ?? 0) - Number(b.phase_number ?? 0))
    return rows
  }, [data])

  return (
    <div>
      <SectionHeader live title="Execution history" description="Phase timeline for this project — loaded from saved planning records." saved={phases.length > 0} />
      <StatePanel isLoading={isLoading} isError={isError} error={error as Error | null} isEmpty={phases.length === 0} emptyTitle="No phase history yet" emptyDescription="Phases appear after project planning begins.">
        <div className="relative space-y-4 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[var(--color-border)]">
          {phases.map((phase) => (
            <InteractiveCard key={String(phase.id)} className="relative ml-2 pl-10" onClick={() => setSelected(phase)}>
              <div className="absolute left-3 top-5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <History className="h-3 w-3" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Phase {String(phase.phase_number)} · {String(phase.name)}</p>
                <Badge variant="outline">{String(phase.status)}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{String(phase.description ?? '')}</p>
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                {formatDate(String(phase.planned_start_date ?? ''))} → {formatDate(String(phase.planned_end_date ?? ''))}
              </p>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={String(selected?.name ?? 'Phase')}>
        {selected && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{String(selected.status)}</Badge>
            <p>{String(selected.description ?? '')}</p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
