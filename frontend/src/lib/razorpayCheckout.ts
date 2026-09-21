/** Load Razorpay checkout script and open payment modal when configured. */

type RazorpayCheckout = {
  mode?: string
  key_id?: string | null
  amount?: number
  currency?: string
  razorpay_order_id?: string
  name?: string
  description?: string
}

type RazorpaySuccess = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.razorpay = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

export async function runPhaseCheckout(opts: {
  checkout: RazorpayCheckout
  onSandboxPay: () => Promise<void>
  onRazorpaySuccess: (result: RazorpaySuccess) => Promise<void>
}): Promise<'sandbox' | 'razorpay'> {
  const { checkout } = opts
  const mode = String(checkout.mode || 'sandbox').toLowerCase()

  if (mode === 'razorpay' && checkout.key_id && checkout.razorpay_order_id) {
    await loadRazorpayScript()
    if (!window.Razorpay) throw new Error('Razorpay SDK unavailable')
    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: checkout.key_id,
        amount: checkout.amount,
        currency: checkout.currency || 'INR',
        name: checkout.name || 'BuildWyse',
        description: checkout.description || 'Phase payment',
        order_id: checkout.razorpay_order_id,
        handler: (response: RazorpaySuccess) => {
          void opts
            .onRazorpaySuccess(response)
            .then(() => resolve())
            .catch(reject)
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      })
      rzp.open()
    })
    return 'razorpay'
  }

  await opts.onSandboxPay()
  return 'sandbox'
}
