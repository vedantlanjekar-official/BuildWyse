import type { ReactNode } from 'react'
import { Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const official = {
  email: 'Buildwyseteam@gmail.com',
  phones: ['+91 9607158690', '+91 9076027036'],
  discord: 'BuildWyse_Official',
  instagram: 'https://www.instagram.com/buildwyse.in',
}

const founders = [
  {
    name: 'Pranav Shinde',
    role: 'Co-founder of BuildWyse',
    photo: '/team/pranav-shinde.png',
    email: 'pranavshinde2310@gmail.com',
    phone: '+91 9607158690',
    links: [
      { label: 'LinkedIn', href: 'https://linkedin.com/in/pranav-shinde-7b7113291', brand: 'linkedin' as const },
      { label: 'Instagram', href: 'https://www.instagram.com/pranav_424', brand: 'instagram' as const },
    ],
  },
  {
    name: 'Vedant Lanjekar',
    role: 'Co-founder of BuildWyse',
    photo: '/team/vedant-lanjekar.jpg',
    email: 'vedantlanjekar456@gmail.com',
    phone: '+91 9076027036',
    links: [
      { label: 'LinkedIn', href: 'https://linkedin.com/in/vedant-lanjekar-89455728b', brand: 'linkedin' as const },
      { label: 'GitHub', href: 'https://github.com/vedantlanjekar-official', brand: 'github' as const },
      { label: 'Portfolio', href: 'https://github.com/vedantlanjekar-official', brand: 'github' as const },
      { label: 'Instagram', href: 'https://www.instagram.com/vedant_lanjekar', brand: 'instagram' as const },
    ],
  },
]

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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function brandIcon(brand: 'linkedin' | 'instagram' | 'github', className = 'h-4 w-4') {
  if (brand === 'linkedin') return <LinkedInIcon className={className} />
  if (brand === 'instagram') return <InstagramIcon className={className} />
  return <GitHubIcon className={className} />
}

function OfficialChannel({
  icon,
  label,
  children,
  href,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  href?: string
}) {
  const inner = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0d2a28] text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <div className="mt-1.5 font-display text-base font-medium text-[#0d2a28] sm:text-lg">{children}</div>
      </div>
    </>
  )

  const className =
    'flex gap-4 rounded-2xl border border-[#d7e0e4] bg-white p-5 transition hover:border-[#8fd4c5]/60 hover:shadow-[0_12px_40px_rgba(13,42,40,0.08)]'

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel="noreferrer"
        className={className}
      >
        {inner}
      </a>
    )
  }

  return <div className={className}>{inner}</div>
}

function PersonContact({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode
  label: string
  value: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:border-[#8fd4c5]/40 hover:bg-white/[0.06]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</span>
        <span className="mt-0.5 block truncate text-sm text-white/90">{value}</span>
      </span>
    </a>
  )
}

export function TeamPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f6f8] text-[var(--color-foreground)]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            BuildWyse
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Home
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Sign in
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-white text-[#0d2a28] hover:bg-[#e8f4f1]">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[58svh] overflow-hidden bg-[#0d2a28] text-white">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-right"
          src="/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d2a28]/94 via-[#0d2a28]/70 to-[#0d2a28]/35" />
        <div
          className="bw-grid-move pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[58svh] max-w-7xl items-end px-6 pb-16 pt-28">
          <div className="max-w-2xl">
            <p className="bw-rise text-xs font-semibold uppercase tracking-[0.22em] text-[#8fd4c5]">Company</p>
            <h1 className="bw-rise bw-rise-delay-1 mt-3 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              The BuildWyse team
            </h1>
            <p className="bw-rise bw-rise-delay-2 mt-5 max-w-lg text-base leading-relaxed text-white/70">
              Meet the co-founders building AI project execution from brief to certified delivery — and reach the official BuildWyse channels.
            </p>
          </div>
        </div>
      </section>

      <section className="relative border-t border-[#d7e0e4] bg-[#f7fafb] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">Official contact</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              BuildWyse channels
            </h2>
            <p className="mt-4 text-[var(--color-muted-foreground)]">
              Company email, phones, Discord community, and Instagram — for partnerships and support.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            <OfficialChannel
              icon={<Mail className="h-4 w-4" strokeWidth={2} />}
              label="Email"
              href={`mailto:${official.email}`}
            >
              <span className="whitespace-nowrap">{official.email}</span>
            </OfficialChannel>

            <OfficialChannel icon={<Phone className="h-4 w-4" strokeWidth={2} />} label="Phone">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {official.phones.map((phone, index) => (
                  <span key={phone} className="inline-flex items-center gap-3 whitespace-nowrap">
                    {index > 0 ? <span className="text-[#c5d2d0]">·</span> : null}
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-[var(--color-primary)]">
                      {phone}
                    </a>
                  </span>
                ))}
              </div>
            </OfficialChannel>

            <OfficialChannel icon={<DiscordIcon className="h-4 w-4" />} label="Discord">
              <span className="whitespace-nowrap">{official.discord}</span>
            </OfficialChannel>

            <OfficialChannel
              icon={<InstagramIcon className="h-4 w-4" />}
              label="Instagram"
              href={official.instagram}
            >
              @buildwyse.in
            </OfficialChannel>
          </div>
        </div>
      </section>

      <section className="relative bg-[#102f2c] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8fd4c5]">Leadership</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Co-founders
            </h2>
            <p className="mt-4 text-white/65">
              The people behind BuildWyse — product, platform, and delivery.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {founders.map((person) => (
              <article
                key={person.name}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-white sm:aspect-[3/4]">
                  <img
                    src={person.photo}
                    alt={person.name}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="p-7 sm:p-8">
                  <h3 className="font-display text-2xl font-semibold tracking-tight">{person.name}</h3>
                  <p className="mt-1 text-sm text-[#8fd4c5]">{person.role}</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <PersonContact
                      icon={<Mail className="h-4 w-4" strokeWidth={2} />}
                      label="Email"
                      value={person.email}
                      href={`mailto:${person.email}`}
                    />
                    <PersonContact
                      icon={<Phone className="h-4 w-4" strokeWidth={2} />}
                      label="Phone"
                      value={person.phone}
                      href={`tel:${person.phone.replace(/\s/g, '')}`}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {person.links.map((link) => (
                      <a
                        key={`${link.label}-${link.href}`}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/85 transition hover:border-[#8fd4c5]/50 hover:bg-white/10 hover:text-white"
                      >
                        {brandIcon(link.brand)}
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d2a28] py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to build with us?
          </h2>
          <p className="mt-4 text-white/65">
            Start a project on BuildWyse, or reach the team through the channels above.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-white px-8 text-[#0d2a28] hover:bg-[#e8f4f1]">
                Get started
              </Button>
            </Link>
            <a href={`mailto:${official.email}`}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/35 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
              >
                Email the team
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0f1f1d] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BuildWyse.in. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <a href={`mailto:${official.email}`} className="hover:text-white">
              {official.email}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
