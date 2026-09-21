import {
  DetailDialog,
  InteractiveCard,
  MetricTile,
  SectionHeader,
  StatePanel,
  formatDate,
} from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { projectService } from '@/services/projectService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  HeartPulse,
  Link2,
  Pencil,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

type Row = Record<string, unknown>

function statusVariant(status: string): 'success' | 'destructive' | 'outline' | 'warning' {
  const s = status.toLowerCase()
  if (['approved', 'completed', 'paid'].includes(s)) return 'success'
  if (['rejected', 'revision_requested'].includes(s)) return 'destructive'
  if (['submitted', 'under_review'].includes(s)) return 'warning'
  return 'outline'
}

function toDateInput(value: unknown): string {
  if (!value) return ''
  const s = String(value)
  return s.slice(0, 10)
}

export function ProjectHealthPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    status: '',
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    description: '',
  })
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [report, setReport] = useState<Row | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const healthQuery = useQuery({
    queryKey: ['health', id],
    queryFn: () => projectService.health(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
    retry: 1,
  })

  const phasesQuery = useQuery({
    queryKey: ['phases', id],
    queryFn: () => projectService.phases(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
    retry: 1,
  })

  const detailQuery = useQuery({
    queryKey: ['phase-detail', selectedPhaseId],
    queryFn: () => projectService.getPhaseDetail(selectedPhaseId!),
    enabled: !!selectedPhaseId,
    refetchInterval: PROJECT_LIVE_MS,
    retry: 1,
  })

  const phases = useMemo(
    () => [...(phasesQuery.data ?? [])].sort((a, b) => Number(a.phase_number ?? 0) - Number(b.phase_number ?? 0)),
    [phasesQuery.data],
  )
  const phase = detailQuery.data?.phase ?? phases.find((p) => String(p.id) === selectedPhaseId)
  const submissions = detailQuery.data?.submissions ?? []
  const evidence = detailQuery.data?.evidence ?? []
  const latestSubmission = submissions[0] as Row | undefined

  useEffect(() => {
    if (!phase) return
    setEditForm({
      status: String(phase.status ?? ''),
      planned_start_date: toDateInput(phase.planned_start_date),
      planned_end_date: toDateInput(phase.planned_end_date),
      actual_start_date: toDateInput(phase.actual_start_date),
      actual_end_date: toDateInput(phase.actual_end_date),
      description: String(phase.description ?? ''),
    })
    setReviewNotes('')
    setRejectReason('')
    setReport(null)
    setActionError(null)
  }, [phase?.id, phase?.updated_at])

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['health', id] }),
      queryClient.invalidateQueries({ queryKey: ['phases', id] }),
      queryClient.invalidateQueries({ queryKey: ['phase-detail', selectedPhaseId] }),
      queryClient.invalidateQueries({ queryKey: ['payments', id] }),
      queryClient.invalidateQueries({ queryKey: ['submissions', id] }),
    ])
  }

  const savePhase = useMutation({
    mutationFn: () =>
      projectService.updatePhase(selectedPhaseId!, {
        status: editForm.status || undefined,
        planned_start_date: editForm.planned_start_date || null,
        planned_end_date: editForm.planned_end_date || null,
        actual_start_date: editForm.actual_start_date || null,
        actual_end_date: editForm.actual_end_date || null,
        description: editForm.description || null,
      }),
    onSuccess: async () => {
      setActionError(null)
      await invalidateAll()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const approveMut = useMutation({
    mutationFn: () =>
      projectService.approveSubmission(String(latestSubmission!.id), reviewNotes.trim() || undefined),
    onSuccess: async () => {
      setActionError(null)
      await invalidateAll()
      navigate(`/projects/${id}/payments?phase=${selectedPhaseId}`)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const rejectMut = useMutation({
    mutationFn: () => projectService.rejectSubmission(String(latestSubmission!.id), rejectReason.trim()),
    onSuccess: async () => {
      setActionError(null)
      setRejectReason('')
      await invalidateAll()
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const reportMut = useMutation({
    mutationFn: () => projectService.phaseReport(selectedPhaseId!),
    onSuccess: (data) => setReport(data),
    onError: (err: Error) => setActionError(err.message),
  })

  const assessment = (healthQuery.data as Row | undefined)?.assessment as Row | undefined
  const ai = (healthQuery.data as Row | undefined)?.ai_insights as Row | undefined
  const metrics = (assessment?.metrics as Row) || {}
  const score = Number(assessment?.health_score ?? 0)
  const overall = String(assessment?.overall_status ?? 'unknown')

  const canReview =
    latestSubmission &&
    ['submitted', 'under_review', 'pending_review'].includes(String(latestSubmission.status).toLowerCase())

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Project health"
        description="Track every phase, review freelancer proofs, approve or reject submissions, and continue to payment."
      />

      <StatePanel
        isLoading={phasesQuery.isLoading && !phasesQuery.data}
        isError={phasesQuery.isError && phases.length === 0}
        error={phasesQuery.error as Error | null}
        isEmpty={false}
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Overall score" value={`${Math.round(score)}`} hint={overall} />
          <MetricTile label="Phases" value={phases.length || Number(metrics.total_phases ?? 0)} />
          <MetricTile
            label="Approved"
            value={
              phases.filter((p) => ['approved', 'completed'].includes(String(p.status))).length ||
              Number(metrics.approved_phases ?? 0)
            }
          />
          <MetricTile
            label="Needs review"
            value={phases.filter((p) => ['submitted', 'under_review'].includes(String(p.status))).length}
          />
        </div>

        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#0d2a28]">Phase progress</h3>
            <p className="text-sm text-[#6b7c78]">Click a phase card for full details, proofs, and review actions.</p>
          </div>
          {ai && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              <HeartPulse className="mr-1 h-3.5 w-3.5" />
              AI monitored
            </Badge>
          )}
        </div>

        {phases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7e4e0] bg-[#fbfcfb] p-8 text-center text-sm text-[#6b7c78]">
            No phases yet. Phases appear once project planning is complete.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {phases.map((p) => {
              const status = String(p.status ?? 'pending')
              return (
                <InteractiveCard key={String(p.id)} onClick={() => setSelectedPhaseId(String(p.id))}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        Phase {String(p.phase_number ?? '')}
                      </p>
                      <p className="mt-1 font-semibold text-[#0d2a28]">{String(p.name)}</p>
                    </div>
                    <Badge variant={statusVariant(status)}>{status.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-[#6b7c78]">
                    {String(p.description || 'No description yet.')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#5a6d68]">
                    <span>Start {formatDate(p.planned_start_date ? String(p.planned_start_date) : null)}</span>
                    <span>Tentative {formatDate(p.planned_end_date ? String(p.planned_end_date) : null)}</span>
                  </div>
                </InteractiveCard>
              )
            })}
          </div>
        )}

        {ai && (
          <div className="mt-4 rounded-2xl border border-[#e7efec] bg-[#f8fbfa] p-4 text-sm text-[#4d615c]">
            <p className="font-medium text-[#0d2a28]">AI health insights</p>
            <p className="mt-1 leading-relaxed">
              {String(ai.summary ?? ai.recommendation ?? 'Monitoring phase delivery signals.')}
            </p>
          </div>
        )}
      </StatePanel>

      <DetailDialog
        open={!!selectedPhaseId}
        onOpenChange={(open) => {
          if (!open) setSelectedPhaseId(null)
        }}
        title={
          phase
            ? `Phase ${String(phase.phase_number)} — ${String(phase.name)}`
            : 'Phase details'
        }
        description="Status, dates, proofs, review, and phase report"
      >
        {detailQuery.isLoading && !phase && <p className="text-sm text-[#6b7c78]">Loading phase details…</p>}
        {detailQuery.isError && !phase && (
          <Alert variant="destructive">{(detailQuery.error as Error).message}</Alert>
        )}
        {detailQuery.isError && phase && (
          <Alert>Could not load full phase detail ({(detailQuery.error as Error).message}). Showing saved phase data.</Alert>
        )}
        {phase && (
          <div className="space-y-5 text-sm">
            {actionError && <Alert variant="destructive">{actionError}</Alert>}

            {detailQuery.data?.payment_required_from && (
              <Alert>
                Previous phase payment is required before this phase can fully proceed. Pay Phase{' '}
                {String((detailQuery.data.payment_required_from as Row).phase_number)} first.
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(String(phase.status))}>
                {String(phase.status).replaceAll('_', ' ')}
              </Badge>
              <Badge variant={detailQuery.data?.is_paid ? 'success' : 'outline'}>
                {detailQuery.data?.is_paid ? 'Paid' : 'Payment pending'}
              </Badge>
              {latestSubmission && (
                <Badge variant="outline">
                  Submission: {String(latestSubmission.status).replaceAll('_', ' ')}
                </Badge>
              )}
            </div>

            <section className="space-y-3 rounded-2xl border border-[#e7efec] p-4">
              <div className="flex items-center gap-2 font-medium text-[#0d2a28]">
                <Pencil className="h-4 w-4" />
                Editable phase details
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Status</p>
                  <select
                    className="h-10 w-full rounded-xl border border-[#d7e4e0] bg-white px-3"
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {[
                      'pending',
                      'in_progress',
                      'submitted',
                      'under_review',
                      'approved',
                      'rejected',
                      'completed',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Description</p>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Planned start</p>
                  <Input
                    type="date"
                    value={editForm.planned_start_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, planned_start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Tentative end</p>
                  <Input
                    type="date"
                    value={editForm.planned_end_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, planned_end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Actual start</p>
                  <Input
                    type="date"
                    value={editForm.actual_start_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, actual_start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Actual end</p>
                  <Input
                    type="date"
                    value={editForm.actual_end_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, actual_end_date: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="rounded-xl"
                disabled={savePhase.isPending}
                onClick={() => savePhase.mutate()}
              >
                {savePhase.isPending ? 'Saving…' : 'Save phase details'}
              </Button>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#e7efec] p-4">
              <div className="flex items-center gap-2 font-medium text-[#0d2a28]">
                <Link2 className="h-4 w-4" />
                Freelancer links & proofs
              </div>
              {evidence.length === 0 ? (
                <p className="text-[#6b7c78]">No proofs or links submitted for this phase yet.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((e) => {
                    const url = String(e.url || '')
                    return (
                      <div
                        key={String(e.id)}
                        className="flex items-start justify-between gap-3 rounded-xl bg-[#f8fbfa] p-3"
                      >
                        <div>
                          <p className="font-medium text-[#0d2a28]">{String(e.title || 'Evidence')}</p>
                          <p className="text-xs text-[#6b7c78]">
                            {String(e.evidence_type || 'file')}
                            {e.description ? ` · ${String(e.description)}` : ''}
                          </p>
                        </div>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-[var(--color-primary)] hover:underline"
                          >
                            Open <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#6b7c78]">No URL</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-[#e7efec] p-4">
              <div className="font-medium text-[#0d2a28]">Phase report submission</div>
              {latestSubmission ? (
                <div className="space-y-2">
                  <p>
                    <span className="text-[#6b7c78]">Status:</span>{' '}
                    {String(latestSubmission.status).replaceAll('_', ' ')}
                  </p>
                  <p>
                    <span className="text-[#6b7c78]">Submitted:</span>{' '}
                    {formatDate(latestSubmission.submitted_at ? String(latestSubmission.submitted_at) : null)}
                  </p>
                  <p className="leading-relaxed text-[#4d615c]">
                    {String(latestSubmission.submission_notes || 'No submission notes provided.')}
                  </p>
                </div>
              ) : (
                <p className="text-[#6b7c78]">Freelancer has not submitted this phase yet.</p>
              )}

              {canReview && (
                <div className="space-y-3 border-t border-[#e7efec] pt-3">
                  <p className="font-medium text-[#0d2a28]">Client review</p>
                  <Textarea
                    placeholder="Approval comments (optional)"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                  <Textarea
                    placeholder="Rejection reason (required to reject, min 10 characters)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-xl"
                      disabled={approveMut.isPending}
                      onClick={() => approveMut.mutate()}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {approveMut.isPending ? 'Approving…' : 'Approve & pay'}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={rejectMut.isPending || rejectReason.trim().length < 10}
                      onClick={() => rejectMut.mutate()}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {rejectMut.isPending ? 'Rejecting…' : 'Reject with comments'}
                    </Button>
                  </div>
                  <p className="text-xs text-[#6b7c78]">
                    Approving redirects you to Payments so you can pay this phase before the next one starts.
                  </p>
                </div>
              )}

              {String(phase.status) === 'approved' && !detailQuery.data?.is_paid && (
                <Button
                  className="rounded-xl"
                  onClick={() => navigate(`/projects/${id}/payments?phase=${selectedPhaseId}`)}
                >
                  Continue to payment
                </Button>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-[#e7efec] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-[#0d2a28]">
                  <FileText className="h-4 w-4" />
                  Detailed phase report
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  disabled={reportMut.isPending}
                  onClick={() => reportMut.mutate()}
                >
                  {reportMut.isPending ? 'Generating…' : 'Generate report'}
                </Button>
              </div>
              {report && (
                <div className="space-y-2 rounded-xl bg-[#f8fbfa] p-3">
                  <p className="font-medium">{String(report.title)}</p>
                  <p className="text-xs text-[#6b7c78]">Generated {formatDate(report.generated_at ? String(report.generated_at) : null)}</p>
                  <ul className="list-disc space-y-1 pl-5 text-[#4d615c]">
                    {((report.findings as string[]) || []).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <p className="pt-1 text-[#0d2a28]">
                    <span className="font-medium">Recommendation:</span> {String(report.recommendation)}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
