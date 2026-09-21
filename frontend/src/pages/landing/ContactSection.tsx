import { useState, type FormEvent, type ReactNode } from 'react'
import { Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiClientError } from '@/services/api'

const PURPOSES = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'investor', label: 'Investor' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'support', label: 'Support' },
  { value: 'press', label: 'Press / Media' },
  { value: 'other', label: 'Other' },
] as const

type Purpose = (typeof PURPOSES)[number]['value']

const fieldClass =
  'h-11 w-full rounded-xl border border-solid border-[#c5d2d0] bg-white px-3.5 text-sm text-[#0d2a28] shadow-none outline-none transition focus-visible:border-[#1f7a6c] focus-visible:ring-2 focus-visible:ring-[#1f7a6c]/25'

const OFFICIAL = {
  email: 'Buildwyseteam@gmail.com',
  phones: ['+91 9607158690', '+91 9076027036'],
  discord: 'BuildWyse_Official',
  instagramUrl: 'https://www.instagram.com/buildwyse.in',
  instagramHandle: '@buildwyse.in',
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}

function ContactChannel({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex w-max min-w-full gap-3 rounded-2xl border border-[#d7e0e4] bg-white px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d2a28] text-white">
        {icon}
      </div>
      <div className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7f7c]">{label}</p>
        <div className="mt-1 whitespace-nowrap text-sm font-medium text-[#0d2a28]">{children}</div>
      </div>
    </div>
  )
}

export function ContactSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [purpose, setPurpose] = useState<Purpose | ''>('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!purpose) {
      setStatus('error')
      setMessage('Please select a purpose.')
      return
    }

    setSubmitting(true)
    setStatus('idle')
    setMessage('')

    try {
      const res = await api.post<{ status: string; message: string }>('/api/v1/contact', {
        name: name.trim(),
        email: email.trim(),
        purpose,
        comment: comment.trim(),
      })
      setStatus('success')
      setMessage(res.message)
      setName('')
      setEmail('')
      setPurpose('')
      setComment('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="contact" className="relative scroll-mt-8 border-t border-[#d7e0e4] bg-[#f7fafb] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(22rem,1fr)_minmax(0,1.15fr)] lg:gap-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">Contact</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Tell us what you need
            </h2>
            <p className="mt-4 max-w-md text-[var(--color-muted-foreground)]">
              Feedback, collaboration, investment, or support — send a note and the BuildWyse team will follow up.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <ContactChannel icon={<Mail className="h-4 w-4" strokeWidth={2} />} label="Email">
                <a href={`mailto:${OFFICIAL.email}`} className="hover:text-[var(--color-primary)]">
                  {OFFICIAL.email}
                </a>
              </ContactChannel>

              <ContactChannel icon={<Phone className="h-4 w-4" strokeWidth={2} />} label="Phone">
                <div className="flex gap-3">
                  {OFFICIAL.phones.map((phone, index) => {
                    const tel = phone.replace(/\s/g, '')
                    return (
                      <span key={phone} className="inline-flex items-center gap-3">
                        {index > 0 ? <span className="text-[#c5d2d0]">·</span> : null}
                        <a href={`tel:${tel}`} className="hover:text-[var(--color-primary)]">
                          {phone}
                        </a>
                      </span>
                    )
                  })}
                </div>
              </ContactChannel>

              <ContactChannel icon={<DiscordIcon className="h-4 w-4" />} label="Discord">
                <span>{OFFICIAL.discord}</span>
              </ContactChannel>

              <ContactChannel icon={<InstagramIcon className="h-4 w-4" />} label="Instagram">
                <a
                  href={OFFICIAL.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--color-primary)]"
                >
                  {OFFICIAL.instagramHandle}
                </a>
              </ContactChannel>
            </div>
          </div>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="rounded-3xl border border-[#d7e0e4] bg-white p-6 shadow-[0_18px_50px_rgba(13,42,40,0.06)] sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7f7c]">
                  Name
                </span>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className={fieldClass}
                />
              </label>

              <label className="block sm:col-span-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7f7c]">
                  Email
                </span>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={fieldClass}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7f7c]">
                  Purpose
                </span>
                <select
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as Purpose | '')}
                  className={`${fieldClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22%3E%3Cpath d=%22M1 1.5 6 6.5 11 1.5%22 stroke=%22%236b7f7c%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E')] bg-[length:12px_8px] bg-[right_14px_center] bg-no-repeat pr-10`}
                >
                  <option value="" disabled>
                    Select a purpose
                  </option>
                  {PURPOSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7f7c]">
                  Comment
                </span>
                <Textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share a short note about how we can help…"
                  rows={5}
                  className="min-h-[130px] rounded-xl border border-solid border-[#c5d2d0] bg-white px-3.5 py-3 text-sm text-[#0d2a28] shadow-none outline-none transition focus-visible:border-[#1f7a6c] focus-visible:ring-2 focus-visible:ring-[#1f7a6c]/25"
                />
              </label>
            </div>

            {message ? (
              <p
                className={`mt-5 text-sm ${status === 'success' ? 'text-[#1f7a6c]' : 'text-red-600'}`}
                role="status"
              >
                {message}
              </p>
            ) : null}

            <div className="mt-6">
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-11 w-full bg-[#0d2a28] px-7 text-white hover:bg-[#16403c] sm:w-auto"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
