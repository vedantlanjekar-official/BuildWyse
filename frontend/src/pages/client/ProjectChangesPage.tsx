import {
  DetailDialog,
  InteractiveCard,
  SectionHeader,
  StatePanel,
  formatCurrency,
  formatDate,
} from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { projectService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, GitBranchPlus, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

type ChangeRow = Record<string, unknown>

function stampClass(status?: string | null) {
  if (status === 'approved') return 'bg-[#e8f6f1] text-[#0f6b5c] border-[#cfe9e0]'
  if (status === 'rejected') return 'bg-[#f8ecec] text-[#8a3a3a] border-[#efd5d5]'
  return 'bg-[#f4f7f6] text-[#5a6d68] border-[#dce6e3]'
}

export function ProjectChangesPage() {
  const { id } = useParams<{ id: string }>()
  const roles = useAuthStore((s) => s.roles())
  const isClient = roles.includes('CLIENT')
  const isFreelancer = roles.includes('FREELANCER') && !roles.includes('CLIENT')
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [comment, setComment] = useState('')
  const [budget, setBudget] = useState('')
  const [days, setDays] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['changes', id],
    queryFn: () => projectService.changes(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const detailQuery = useQuery({
    queryKey: ['change', selectedId],
    queryFn: () => projectService.getChange(selectedId!),
    enabled: !!selectedId,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const createMutation = useMutation({
    mutationFn: () => projectService.createChange(id!, { title, description }),
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setShowForm(false)
      void queryClient.invalidateQueries({ queryKey: ['changes', id] })
      void queryClient.invalidateQueries({ queryKey: ['project', id] })
    },
  })

  const responseMutation = useMutation({
    mutationFn: () =>
      projectService.freelancerChangeResponse(selectedId!, {
        comment,
        budget_amount: Number(budget),
        estimated_days: days ? Number(days) : undefined,
      }),
    onSuccess: () => {
      setComment('')
      setBudget('')
      setDays('')
      void queryClient.invalidateQueries({ queryKey: ['changes', id] })
      void queryClient.invalidateQueries({ queryKey: ['change', selectedId] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (payload: { status?: string; approval_type?: string }) =>
      projectService.approveChange(selectedId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['changes', id] })
      void queryClient.invalidateQueries({ queryKey: ['change', selectedId] })
    },
  })

  const changes = (data ?? []) as ChangeRow[]
  const selected = (detailQuery.data ?? changes.find((c) => String(c.id) === selectedId) ?? null) as ChangeRow | null

  return (
    <div>
      <SectionHeader
        live
        title="Change requests"
        description="Client raises a change → freelancer comments with budget → both parties approve with stamps."
        saved={changes.length > 0}
        actions={
          isClient ? (
            <Button onClick={() => setShowForm((v) => !v)}>
              <GitBranchPlus className="mr-2 h-4 w-4" />
              {showForm ? 'Close form' : 'New change request'}
            </Button>
          ) : null
        }
      />

      {showForm && isClient && (
        <div className="mb-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <Input placeholder="Change title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="Describe the requested change, business intent, and expected outcome…"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {createMutation.isError && (
            <Alert variant="destructive">{(createMutation.error as Error).message}</Alert>
          )}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || title.trim().length < 3 || description.trim().length < 10}
          >
            {createMutation.isPending ? 'Submitting…' : 'Submit change request'}
          </Button>
        </div>
      )}

      <StatePanel
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={changes.length === 0}
        emptyTitle="No change requests yet"
        emptyDescription="Create a CR when scope needs to evolve beyond the approved baseline."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {changes.map((cr) => (
            <InteractiveCard key={String(cr.id)} onClick={() => setSelectedId(String(cr.id))}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{String(cr.title)}</p>
                <Badge variant="outline">{String(cr.status)}</Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-[var(--color-muted-foreground)]">
                {String(cr.description ?? '')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${stampClass(String(cr.freelancer_approval_status ?? ''))}`}>
                  Freelancer: {String(cr.freelancer_approval_status ?? 'pending')}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${stampClass(String(cr.client_approval_status ?? ''))}`}>
                  Client: {String(cr.client_approval_status ?? 'pending')}
                </span>
              </div>
              {cr.budget_amount != null && (
                <p className="mt-2 text-sm font-medium text-[#0d2a28]">
                  Budget {formatCurrency(cr.budget_amount, String(cr.budget_currency ?? 'INR'))}
                </p>
              )}
              <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{formatDate(String(cr.created_at ?? ''))}</p>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>

      <DetailDialog
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
        title={String(selected?.title ?? 'Change request')}
        description="Full change workflow with timestamps, budget, comments, and approvals"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{String(selected.status)}</Badge>
              <Badge variant="secondary">{String(selected.priority ?? 'medium')}</Badge>
              <Badge variant="outline">{String(selected.change_type ?? 'scope')}</Badge>
            </div>

            <div className="rounded-2xl border border-[#e2ebe8] bg-[#fbfcfb] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">Request</p>
              <p className="mt-2 leading-relaxed text-[#0d2a28]">{String(selected.description ?? '')}</p>
              <p className="mt-2 text-xs text-[#6b7c78]">
                Raised by {String(selected.requested_by_name ?? 'Client')} · {formatDate(String(selected.created_at ?? ''))}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${stampClass(String(selected.freelancer_approval_status ?? ''))}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="font-semibold">Freelancer approval</p>
                </div>
                <p className="mt-2 capitalize">{String(selected.freelancer_approval_status ?? 'pending')}</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(String(selected.freelancer_approved_at ?? ''))}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${stampClass(String(selected.client_approval_status ?? ''))}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="font-semibold">Client approval</p>
                </div>
                <p className="mt-2 capitalize">{String(selected.client_approval_status ?? 'pending')}</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(String(selected.client_approved_at ?? ''))}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e2ebe8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">Budget</p>
              {selected.budget_amount != null ? (
                <div className="mt-2 space-y-1">
                  <p className="text-lg font-semibold text-[#0d2a28]">
                    {formatCurrency(selected.budget_amount, String(selected.budget_currency ?? 'INR'))}
                  </p>
                  {selected.budget_days != null && <p className="text-xs text-[#6b7c78]">{String(selected.budget_days)} estimated days</p>}
                  <p className="text-xs text-[#6b7c78]">Status: {String(selected.budget_status ?? 'proposed')}</p>
                </div>
              ) : (
                <p className="mt-2 text-[var(--color-muted-foreground)]">Awaiting freelancer budget.</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#e2ebe8] p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">
                <MessageSquare className="h-3.5 w-3.5" /> Freelancer comments
              </p>
              {Array.isArray(selected.comments) && selected.comments.length > 0 ? (
                <div className="space-y-3">
                  {(selected.comments as ChangeRow[]).map((c, idx) => (
                    <div key={String(c.id ?? idx)} className="rounded-xl bg-[#f7faf9] px-3 py-2">
                      <p className="leading-relaxed">{String(c.message)}</p>
                      <p className="mt-1 text-[11px] text-[#8a9a96]">
                        {String(c.author_name ?? 'Freelancer')} · {formatDate(String(c.created_at ?? ''))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--color-muted-foreground)]">No freelancer comments yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#e2ebe8] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">Timeline</p>
              <div className="space-y-3">
                {((selected.timeline as ChangeRow[]) ?? []).map((event, idx) => (
                  <div key={`${String(event.type)}-${idx}`} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                    <div>
                      <p className="font-medium text-[#0d2a28]">{String(event.label)}</p>
                      {event.detail != null && <p className="text-[var(--color-muted-foreground)]">{String(event.detail)}</p>}
                      <p className="text-[11px] text-[#8a9a96]">
                        {String(event.by ?? '')} · {formatDate(String(event.at ?? ''))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isFreelancer && (
              <div className="space-y-3 rounded-2xl border border-[#dce6e3] bg-white p-4">
                <p className="font-semibold text-[#0d2a28]">Freelancer response</p>
                <Textarea
                  placeholder="Comment on the change request…"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="number"
                    placeholder="Budget amount"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Estimated days (optional)"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  />
                </div>
                {responseMutation.isError && (
                  <Alert variant="destructive">{(responseMutation.error as Error).message}</Alert>
                )}
                <Button
                  className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                  disabled={responseMutation.isPending || comment.trim().length < 3 || !budget}
                  onClick={() => responseMutation.mutate()}
                >
                  {responseMutation.isPending ? 'Submitting…' : 'Submit comment & budget'}
                </Button>
              </div>
            )}

            {isClient && (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                  disabled={approveMutation.isPending || selected.client_approval_status === 'approved'}
                  onClick={() => approveMutation.mutate({ status: 'approved', approval_type: 'client' })}
                >
                  Approve as client
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ status: 'rejected', approval_type: 'client' })}
                >
                  Reject
                </Button>
              </div>
            )}

            {isFreelancer && selected.freelancer_approval_status !== 'approved' && (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ status: 'approved', approval_type: 'freelancer' })}
              >
                Stamp freelancer approval
              </Button>
            )}
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
