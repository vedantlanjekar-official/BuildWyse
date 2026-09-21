import { FileText, Handshake, MessageSquareText, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useState } from 'react'

const stages = [
  {
    title: 'Discover',
    short: 'Capture intent through guided AI requirement conversations.',
    long: 'Clients describe goals in natural language while BuildWyse extracts constraints, users, and outcomes into structured requirement DNA that drives every later decision.',
    icon: MessageSquareText,
  },
  {
    title: 'Define',
    short: 'Convert discovery into documents and budget baselines.',
    long: 'Approved requirements generate definition packages and investment ranges so stakeholders share one clear scope, timeline expectation, and commercial model before matching begins.',
    icon: FileText,
  },
  {
    title: 'Match',
    short: 'Rank freelancers against skills, experience, and fit.',
    long: 'Requirement DNA is scored against expertise DNA to produce a durable Top 10 shortlist with transparent explanations, verification signals, and selectable candidates for delivery.',
    icon: Sparkles,
  },
  {
    title: 'Execute',
    short: 'Deliver work through phases, milestones, and evidence.',
    long: 'Execution becomes a living graph of phases, tasks, submissions, and proof artifacts so progress stays visible, reviewable, and tied to milestone accountability throughout the project.',
    icon: Workflow,
  },
  {
    title: 'Assure',
    short: 'Monitor health and manage formal change requests.',
    long: 'Health scoring and CRMS keep delivery honest by surfacing risk early and routing scope changes through impact analysis instead of informal chat-thread drift.',
    icon: ShieldCheck,
  },
  {
    title: 'Close',
    short: 'Complete payments and issue completion certificates.',
    long: 'Approved milestones unlock payment flows and BuildWyse issues a persisted completion certificate, turning successful delivery into a verifiable closeout record for both sides.',
    icon: Handshake,
  },
]

export function LifecycleDiagram() {
  const [flipped, setFlipped] = useState<string | null>(null)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" style={{ perspective: '1200px' }}>
      {stages.map((stage, i) => {
        const Icon = stage.icon
        const isFlipped = flipped === stage.title
        return (
          <button
            key={stage.title}
            type="button"
            aria-pressed={isFlipped}
            onClick={() => setFlipped(isFlipped ? null : stage.title)}
            className="bw-rise group relative h-[250px] w-full text-left"
            style={{ animationDelay: `${i * 0.1}s`, perspective: '1200px' }}
          >
            <div
              className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
              style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              {/* Front */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl border border-[#d5e2e0] bg-white p-6 shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#1f7a6c]/40 group-hover:shadow-md [backface-visibility:hidden]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#1f7a6c]/8" />
                <div className="relative flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d2a28] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-[#0d2a28]">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {stage.short}
                  </p>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl border border-[#1f7a6c]/35 bg-[#0d2a28] p-6 text-white shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">
                    {stage.title}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-white/85">
                    {stage.long}
                  </p>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
