import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { LifecycleDiagram } from '@/pages/landing/LifecycleDiagram'
import { MatchingDiagram } from '@/pages/landing/MatchingDiagram'
import { ExecutionDiagram } from '@/pages/landing/ExecutionDiagram'
import { HealthDiagram } from '@/pages/landing/HealthDiagram'
import { ContactSection } from '@/pages/landing/ContactSection'

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f6f8] text-[var(--color-foreground)]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            BuildWyse
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/team">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Team
              </Button>
            </Link>
            <a href="#contact">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Contact
              </Button>
            </a>
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

      {/* Hero — brand first, video shifted right as the visual plane */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#0d2a28] text-white">
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
        {/* Stronger shade on the left for copy; video stays clearer on the right */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d2a28]/92 via-[#0d2a28]/55 to-[#0d2a28]/20" />
        <div
          className="bw-grid-move pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center px-6 pb-16 pt-28">
          <div className="max-w-xl">
            <p className="bw-rise font-display text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              BuildWyse
            </p>
            <h1 className="bw-rise bw-rise-delay-1 mt-5 font-display text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
              AI project execution from brief to certified delivery.
            </h1>
            <p className="bw-rise bw-rise-delay-2 mt-5 max-w-md text-base leading-relaxed text-white/70">
              Requirements, matching, milestones, verification, and payments — orchestrated as one continuous system.
            </p>
            <div className="bw-rise bw-rise-delay-3 mt-9 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="bg-white px-7 text-[#0d2a28] hover:bg-[#e8f4f1]">
                  Start building
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/35 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lifecycle diagram */}
      <section className="relative border-t border-[#d7e0e4] bg-[#f7fafb] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">Platform lifecycle</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              One operating system for project delivery
            </h2>
            <p className="mt-4 text-[var(--color-muted-foreground)]">
              Every stage feeds the next — discovery produces DNA, matching produces shortlists, execution produces proof.
            </p>
          </div>
          <div className="mt-14">
            <LifecycleDiagram />
          </div>
        </div>
      </section>

      {/* Matching DNA diagram */}
      <section className="relative bg-[#102f2c] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8fd4c5]">Matching engine</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Requirement DNA meets Expertise DNA
            </h2>
            <p className="mt-4 text-white/65">
              Animated scoring across skills, experience, verification, and semantic fit — ranked into a durable Top 10.
            </p>
          </div>
          <div className="mt-14">
            <MatchingDiagram />
          </div>
        </div>
      </section>

      {/* Execution diagram */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">Execution graph</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Phases, milestones, evidence, verification
            </h2>
            <p className="mt-4 text-[var(--color-muted-foreground)]">
              Delivery is visible as a living graph — not a spreadsheet of status guesses.
            </p>
          </div>
          <div className="mt-14">
            <ExecutionDiagram />
          </div>
        </div>
      </section>

      {/* Health / change / certificate diagram */}
      <section className="border-t border-[#d7e0e4] bg-[linear-gradient(180deg,#f4f8f7,white)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">Assurance layer</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Health, change control, certified closeout
            </h2>
            <p className="mt-4 text-[var(--color-muted-foreground)]">
              CRMS and ASSM keep scope honest. Certificates lock the outcome into a verifiable BuildWyse record.
            </p>
          </div>
          <div className="mt-14">
            <HealthDiagram />
          </div>
        </div>
      </section>

      <ContactSection />

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[#0d2a28] py-24 text-white">
        <div className="bw-drift pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#c4a574]/25 blur-3xl" />
        <div className="bw-drift pointer-events-none absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-[#1f7a6c]/30 blur-3xl" style={{ animationDelay: '-5s' }} />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Enter the workspace. Your project state is waiting.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-white/70">
            Sign in to continue an engagement, or register to launch a new BuildWyse project with AI-guided discovery.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-white px-8 text-[#0d2a28] hover:bg-[#e8f4f1]">
                Register
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/35 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d7e0e4] bg-[#0f1f1d] text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
                BuildWyse
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
                AI-powered project execution from requirements discovery to certified delivery.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">Platform</p>
              <ul className="mt-4 space-y-2.5 text-sm text-white/70">
                <li><a href="#/" className="hover:text-white">Requirements AI</a></li>
                <li><a href="#/" className="hover:text-white">Smart Matching</a></li>
                <li><a href="#/" className="hover:text-white">Execution & Verification</a></li>
                <li><a href="#/" className="hover:text-white">Certificates</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">Workspace</p>
              <ul className="mt-4 space-y-2.5 text-sm text-white/70">
                <li><Link to="/login" className="hover:text-white">Client Portal</Link></li>
                <li><Link to="/register" className="hover:text-white">Create account</Link></li>
                <li><Link to="/login" className="hover:text-white">Freelancer access</Link></li>
                <li><Link to="/" className="hover:text-white">Product overview</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">Company</p>
              <ul className="mt-4 space-y-2.5 text-sm text-white/70">
                <li><Link to="/team" className="hover:text-white">About BuildWyse</Link></li>
                <li><Link to="/team" className="hover:text-white">Team</Link></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
                <li><a href="mailto:Buildwyseteam@gmail.com" className="hover:text-white">Buildwyseteam@gmail.com</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} BuildWyse.in. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Secured with Supabase Auth</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
