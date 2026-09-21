import {
  DetailDialog,
  InteractiveCard,
  MetricTile,
  SectionHeader,
  SoftCard,
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
import { runPhaseCheckout } from '@/lib/razorpayCheckout'
import { projectService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Download, Plus, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

type Row = Record<string, unknown>

export function ProjectServicesPage() {
  const { id } = useParams<{ id: string }>()
  const roles = useAuthStore((s) => s.roles())
  const canCreate = roles.includes('CLIENT') || roles.includes('FREELANCER') || roles.includes('ADMIN')
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceType, setServiceType] = useState('maintenance')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['services', id],
    queryFn: () => projectService.services(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      projectService.createService(id!, {
        title,
        description,
        service_type: serviceType,
      }),
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setShowForm(false)
      void queryClient.invalidateQueries({ queryKey: ['services', id] })
    },
  })

  const services = data ?? []

  return (
    <div>
      <SectionHeader
        title="After-sales services"
        description="Raise support, maintenance, and after-sales requests for this project."
        actions={
          canCreate ? (
            <Button className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-2 h-4 w-4" />
              {showForm ? 'Close form' : 'Add after-sales service'}
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <Input placeholder="Service title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            {['maintenance', 'bug_fix', 'new_feature', 'integration', 'upgrade', 'performance', 'support', 'other'].map(
              (t) => (
                <option key={t} value={t}>
                  {t.replaceAll('_', ' ')}
                </option>
              ),
            )}
          </select>
          <Textarea
            placeholder="Describe the after-sales need…"
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
            {createMutation.isPending ? 'Submitting…' : 'Submit service request'}
          </Button>
        </div>
      )}

      <StatePanel
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={services.length === 0}
        emptyTitle="No service requests yet"
        emptyDescription="Use Add after-sales service to create your first request."
        emptyAction={
          canCreate ? (
            <Button className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add after-sales service
            </Button>
          ) : null
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((s) => (
            <InteractiveCard key={String(s.id)} onClick={() => setSelected(s)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{String(s.title ?? s.request_type ?? 'Service request')}</p>
                    <Badge variant="outline">{String(s.status ?? 'open')}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
                    {String(s.description ?? s.classification ?? '')}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{formatDate(String(s.created_at ?? ''))}</p>
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>
      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={String(selected?.title ?? 'Service request')}>
        {selected && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{String(selected.status ?? 'open')}</Badge>
            <p className="leading-relaxed">{String(selected.description ?? '')}</p>
            {selected.classification != null && <p>Classification: {String(selected.classification)}</p>}
            <p className="text-xs text-[var(--color-muted-foreground)]">Type: {String(selected.service_type ?? '—')}</p>
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

export function ProjectPaymentsPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Row | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [payingPhaseId, setPayingPhaseId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const focusPhaseId = searchParams.get('phase')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => projectService.listPayments(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
    retry: 1,
  })

  const orders = data?.orders ?? []
  const phasePayments = data?.phase_payments ?? []
  const totals = data?.totals ?? {}
  const paid = Number(totals.paid_count ?? 0)

  useEffect(() => {
    if (!focusPhaseId || phasePayments.length === 0) return
    const el = document.getElementById(`phase-pay-${focusPhaseId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusPhaseId, phasePayments.length])

  async function downloadReceipt(order: Row) {
    const orderId = String(order.id)
    setDownloadingId(orderId)
    try {
      const short = orderId.slice(0, 8)
      await projectService.downloadPaymentReceipt(orderId, `BuildWyse_Receipt_${short}.pdf`)
    } finally {
      setDownloadingId(null)
    }
  }

  async function payPhase(phaseId: string) {
    setPayingPhaseId(phaseId)
    setPayError(null)
    try {
      const result = await projectService.checkoutPhasePayment(phaseId)
      const orderId = String(result.order.id)
      const checkout = (result.checkout || {}) as Record<string, unknown>
      await runPhaseCheckout({
        checkout: {
          mode: String(checkout.mode || 'sandbox'),
          key_id: checkout.key_id ? String(checkout.key_id) : null,
          amount: Number(checkout.amount ?? 0),
          currency: String(checkout.currency || result.currency || 'INR'),
          razorpay_order_id: checkout.razorpay_order_id ? String(checkout.razorpay_order_id) : undefined,
          name: checkout.name ? String(checkout.name) : 'BuildWyse',
          description: checkout.description
            ? String(checkout.description)
            : `Phase payment · ${formatCurrency(result.amount, result.currency)}`,
        },
        onSandboxPay: async () => {
          await projectService.completeCheckout({ payment_order_id: orderId })
        },
        onRazorpaySuccess: async (rz) => {
          await projectService.completeCheckout({
            payment_order_id: orderId,
            razorpay_payment_id: rz.razorpay_payment_id,
            razorpay_order_id: rz.razorpay_order_id,
            razorpay_signature: rz.razorpay_signature,
          })
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['payments', id] })
      await queryClient.invalidateQueries({ queryKey: ['phases', id] })
      await queryClient.invalidateQueries({ queryKey: ['health', id] })
      if (focusPhaseId === phaseId) {
        const next = new URLSearchParams(searchParams)
        next.delete('phase')
        setSearchParams(next, { replace: true })
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPayingPhaseId(null)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payments"
        description="Pay each approved phase amount (Razorpay when configured). Next phase unlocks after the previous phase is paid."
      />

      {payError && <Alert variant="destructive">{payError}</Alert>}
      {focusPhaseId && (
        <Alert>
          Complete payment for the approved phase below to unlock the next phase.
        </Alert>
      )}
      {isError && (
        <Alert variant="destructive">
          {(error as Error)?.message || 'Could not load payments'}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </Alert>
      )}

      <StatePanel
        isLoading={isLoading && !data}
        isError={false}
        error={null}
        isEmpty={!isLoading && orders.length === 0 && phasePayments.length === 0}
        emptyTitle="No payment records yet"
        emptyDescription="Phase payment amounts and orders will appear here once milestones are planned."
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Orders" value={Number(totals.order_count ?? orders.length)} />
          <MetricTile label="Paid" value={paid} />
          <MetricTile
            label="Phase planned"
            value={formatCurrency(totals.planned_phase_amount ?? 0)}
          />
        </div>

        {phasePayments.length > 0 && (
          <SoftCard title="Phase payments" subtitle="Pay phase amounts to keep delivery moving" className="mb-6">
            <div className="grid gap-3 md:grid-cols-2">
              {phasePayments.map((phase) => {
                const phaseId = String(phase.phase_id)
                const isFocused = focusPhaseId === phaseId
                const isPaid = Boolean(phase.is_paid) || Number(phase.paid_amount ?? 0) > 0
                const canPay =
                  !isPaid && ['approved', 'completed'].includes(String(phase.phase_status))
                return (
                  <div
                    id={`phase-pay-${phaseId}`}
                    key={phaseId}
                    className={`rounded-2xl border bg-[#fbfcfb] p-4 ${
                      isFocused ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[#eef3f1]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                          Phase {String(phase.phase_number ?? '')}
                        </p>
                        <p className="mt-1 font-semibold text-[#0d2a28]">{String(phase.phase_name)}</p>
                      </div>
                      <Badge variant={isPaid ? 'success' : 'outline'}>
                        {isPaid ? 'paid' : String(phase.phase_status)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xl font-semibold text-[#0d2a28]">
                      {formatCurrency(phase.planned_amount, String(phase.currency ?? 'INR'))}
                    </p>
                    <p className="mt-1 text-xs text-[#6b7c78]">
                      Paid {formatCurrency(phase.paid_amount, String(phase.currency ?? 'INR'))} ·{' '}
                      {String(phase.milestone_count ?? 0)} milestone(s)
                    </p>
                    {Array.isArray(phase.milestones) && phase.milestones.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {(phase.milestones as Row[]).map((m) => (
                          <div key={String(m.id)} className="flex items-center justify-between text-xs text-[#5a6d68]">
                            <span className="truncate pr-2">{String(m.title)}</span>
                            <span className="shrink-0 font-medium">
                              {formatCurrency(m.amount, String(m.currency ?? phase.currency ?? 'INR'))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      {isPaid ? (
                        <Badge variant="success">Phase paid</Badge>
                      ) : (
                        <Button
                          type="button"
                          className="rounded-xl"
                          disabled={!canPay || payingPhaseId === phaseId}
                          onClick={() => void payPhase(phaseId)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {payingPhaseId === phaseId
                            ? 'Processing…'
                            : `Pay Phase ${String(phase.phase_number)} · ${formatCurrency(
                                phase.planned_amount,
                                String(phase.currency ?? 'INR'),
                              )}`}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </SoftCard>
        )}

        <div className="mb-3">
          <h3 className="font-display text-lg font-semibold text-[#0d2a28]">Payment orders</h3>
          <p className="text-sm text-[#6b7c78]">Click a card for details, or download the PDF receipt.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {orders.map((p) => (
            <InteractiveCard key={String(p.id)} onClick={() => setSelected(p)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{formatCurrency(p.amount ?? p.total_amount, String(p.currency ?? 'INR'))}</p>
                    <Badge variant={String(p.status) === 'paid' ? 'success' : 'outline'}>{String(p.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {String(p.description ?? p.order_type ?? 'Payment order')}
                  </p>
                  {(p.phase_name || p.milestone_title) && (
                    <p className="mt-1 text-xs text-[#0f6b5c]">
                      {[p.phase_name, p.milestone_title].filter(Boolean).map(String).join(' · ')}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{formatDate(String(p.created_at ?? ''))}</p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={downloadingId === String(p.id)}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void downloadReceipt(p)
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {downloadingId === String(p.id) ? 'Downloading…' : 'Download PDF'}
                    </Button>
                  </div>
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </StatePanel>

      <DetailDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title="Payment transaction"
        description="Professionally structured receipt details"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                disabled={downloadingId === String(selected.id)}
                onClick={() => void downloadReceipt(selected)}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingId === String(selected.id) ? 'Downloading…' : 'Download receipt PDF'}
              </Button>
            </div>
            <PaymentReceipt order={selected} />
          </div>
        )}
      </DetailDialog>
    </div>
  )
}

function PaymentReceipt({ order }: { order: Row }) {
  const txn = (order.transaction as Row | undefined) ?? {}
  const rows = [
    { label: 'Amount', value: formatCurrency(txn.amount ?? order.amount, String(txn.currency ?? order.currency ?? 'INR')) },
    { label: 'Status', value: String(txn.status ?? order.status ?? '—') },
    { label: 'Transaction ID', value: String(txn.transaction_id ?? order.id ?? '—') },
    { label: 'Payment ID', value: String(txn.payment_id ?? '—') },
    { label: 'Date', value: String(txn.date ?? '—') },
    { label: 'Day', value: String(txn.day ?? '—') },
    { label: 'Time', value: String(txn.time ?? '—') },
    { label: 'Timestamp', value: formatDate(String(txn.paid_at ?? txn.created_at ?? order.created_at ?? '')) },
    { label: 'Payment method', value: String(txn.payment_method ?? '—') },
    { label: 'Provider', value: String(txn.provider ?? order.provider ?? '—') },
    { label: 'Bank', value: String(txn.bank_name ?? '—') },
    { label: 'UPI ID', value: String(txn.upi_id ?? '—') },
    { label: 'Account', value: txn.account_last4 ? `•••• ${txn.account_last4}` : '—' },
    { label: 'Order type', value: String(order.order_type ?? '—') },
    { label: 'Purpose', value: String(order.description ?? '—') },
  ]

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#dce6e3]">
      <div className="bg-gradient-to-br from-[#0d2a28] to-[#1a5c55] px-5 py-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100/80">BuildWyse Receipt</p>
        <p className="mt-2 font-display text-2xl font-semibold">
          {formatCurrency(txn.amount ?? order.amount, String(txn.currency ?? order.currency ?? 'INR'))}
        </p>
        <p className="mt-1 text-sm text-teal-50/85">{String(order.description ?? order.order_type ?? 'Payment')}</p>
      </div>
      <div className="divide-y divide-[#eef3f1] bg-white">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
            <span className="text-[#8a9a96]">{row.label}</span>
            <span className="max-w-[60%] text-right font-medium text-[#0d2a28]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
