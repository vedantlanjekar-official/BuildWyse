import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { userService, type PaymentMethod } from '@/services/projectService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CreditCard, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

const CARD_TYPES = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'American Express' },
  { value: 'other', label: 'Other' },
] as const

type AddMode = 'bank' | 'card' | null

const fieldClass =
  'flex h-11 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]'

export function PaymentMethodsSection() {
  const queryClient = useQueryClient()
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [bankName, setBankName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [cardType, setCardType] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [setAsAutopay, setSetAsAutopay] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['users', 'me', 'payment-methods'],
    queryFn: () => userService.listPaymentMethods(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users', 'me', 'payment-methods'] })

  const resetForm = () => {
    setBankName('')
    setBankBranch('')
    setAccountHolderName('')
    setAccountNumber('')
    setIfscCode('')
    setCardType('')
    setCardNumber('')
    setCardCvc('')
    setCardExpiry('')
    setSetAsAutopay(false)
    setError(null)
    setAddMode(null)
  }

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => userService.createPaymentMethod(body),
    onSuccess: async () => {
      resetForm()
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const autopayMutation = useMutation({
    mutationFn: (id: string) => userService.setAutopay(id),
    onSuccess: async () => {
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deletePaymentMethod(id),
    onSuccess: async () => {
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const submitBank = () => {
    setError(null)
    createMutation.mutate({
      method_type: 'bank',
      bank_name: bankName.trim(),
      bank_branch: bankBranch.trim(),
      account_holder_name: accountHolderName.trim(),
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim().toUpperCase(),
    })
  }

  const submitCard = () => {
    setError(null)
    createMutation.mutate({
      method_type: 'card',
      card_type: cardType,
      card_number: cardNumber.trim(),
      card_expiry: cardExpiry.trim(),
      is_autopay: setAsAutopay,
    })
  }

  const banks = methods.filter((m) => m.method_type === 'bank')
  const cards = methods.filter((m) => m.method_type === 'card')

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setError(null)
            setAddMode('bank')
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add bank account
        </Button>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setError(null)
            setAddMode('card')
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add card
        </Button>
      </div>

      {addMode === 'bank' ? (
        <div className="rounded-2xl border border-[#e5ecea] bg-[#f8fbfa] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0d2a28]">
            <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
            New bank account
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Bank name</span>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="h-11 rounded-xl" placeholder="HDFC Bank" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Branch</span>
              <Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className="h-11 rounded-xl" placeholder="Branch name" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Account holder name</span>
              <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="h-11 rounded-xl" placeholder="As per bank records" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Account number</span>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-11 rounded-xl" placeholder="Bank account number" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">IFSC code</span>
              <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} className="h-11 rounded-xl uppercase" placeholder="HDFC0001234" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]" disabled={createMutation.isPending} onClick={submitBank}>
              {createMutation.isPending ? 'Saving…' : 'Save bank account'}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {addMode === 'card' ? (
        <div className="rounded-2xl border border-[#e5ecea] bg-[#f8fbfa] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0d2a28]">
            <CreditCard className="h-4 w-4 text-[var(--color-primary)]" />
            New card
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Card type</span>
              <select value={cardType} onChange={(e) => setCardType(e.target.value)} className={fieldClass}>
                <option value="">Select type</option>
                {CARD_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2 xl:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Card number</span>
              <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="h-11 rounded-xl tracking-[0.12em]" placeholder="XXXX XXXX XXXX XXXX" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">CVC</span>
              <Input
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="h-11 rounded-xl"
                placeholder="•••"
                type="password"
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]">Expiry date</span>
              <Input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className="h-11 rounded-xl" placeholder="MM/YY" />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-[#0d2a28]">
            <input type="checkbox" checked={setAsAutopay} onChange={(e) => setSetAsAutopay(e.target.checked)} className="h-4 w-4 accent-[#0d2a28]" />
            Set this card as auto-pay method
          </label>
          <p className="mt-2 text-xs text-[#6b7c78]">CVC is never stored on the server.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]" disabled={createMutation.isPending} onClick={submitCard}>
              {createMutation.isPending ? 'Saving…' : 'Save card'}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0d2a28]">
          <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
          Saved bank accounts
        </div>
        {isLoading ? <p className="text-sm text-[#6b7c78]">Loading…</p> : null}
        {!isLoading && banks.length === 0 ? <p className="text-sm text-[#6b7c78]">No bank accounts added yet.</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {banks.map((method) => (
            <MethodCard
              key={method.id}
              method={method}
              onDelete={() => deleteMutation.mutate(method.id)}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0d2a28]">
          <CreditCard className="h-4 w-4 text-[var(--color-primary)]" />
          Saved cards
        </div>
        {!isLoading && cards.length === 0 ? <p className="text-sm text-[#6b7c78]">No cards added yet.</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((method) => (
            <MethodCard
              key={method.id}
              method={method}
              onDelete={() => deleteMutation.mutate(method.id)}
              onAutopay={() => autopayMutation.mutate(method.id)}
              deleting={deleteMutation.isPending}
              settingAutopay={autopayMutation.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MethodCard({
  method,
  onDelete,
  onAutopay,
  deleting,
  settingAutopay,
}: {
  method: PaymentMethod
  onDelete: () => void
  onAutopay?: () => void
  deleting?: boolean
  settingAutopay?: boolean
}) {
  const isCard = method.method_type === 'card'
  return (
    <div className="rounded-2xl border border-[#e5ecea] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0d2a28]">{method.label || (isCard ? 'Card' : 'Bank account')}</p>
          {isCard ? (
            <p className="mt-1 text-sm text-[#3d524e]">
              {(method.card_type || 'card').toUpperCase()} · {method.card_number} · Exp {method.card_expiry}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#3d524e]">
              {method.bank_name}
              {method.bank_branch ? ` · ${method.bank_branch}` : ''} · {method.account_number}
              {method.ifsc_code ? ` · ${method.ifsc_code}` : ''}
            </p>
          )}
          {method.account_holder_name ? (
            <p className="mt-1 text-xs text-[#6b7c78]">{method.account_holder_name}</p>
          ) : null}
        </div>
        <button type="button" onClick={onDelete} disabled={deleting} className="rounded-lg p-2 text-[#8a9a96] hover:bg-[#f4f7f6] hover:text-red-600" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {isCard ? (
        <div className="mt-4">
          {method.is_autopay ? (
            <span className="inline-flex rounded-full bg-[#e7f6f1] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0f6b5c]">
              Auto-pay
            </span>
          ) : (
            <Button variant="outline" size="sm" className="rounded-lg" disabled={settingAutopay} onClick={onAutopay}>
              Use for auto-pay
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
