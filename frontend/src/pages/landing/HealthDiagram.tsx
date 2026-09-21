import { useState, type ReactNode } from 'react'

function FlipCard({
  front,
  title,
  detail,
  dark = false,
}: {
  front: ReactNode
  title: string
  detail: string
  dark?: boolean
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <button
      type="button"
      aria-pressed={flipped}
      onClick={() => setFlipped((v) => !v)}
      className="relative h-[420px] w-full text-left"
      style={{ perspective: '1200px' }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <div
          className={`absolute inset-0 overflow-hidden rounded-[28px] border p-6 shadow-sm [backface-visibility:hidden] sm:p-6 ${
            dark ? 'border-[#d5e2e0] bg-[#0d2a28] text-white' : 'border-[#d5e2e0] bg-white'
          }`}
        >
          {front}
        </div>

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${
            dark
              ? 'border-[#8fd4c5]/35 bg-[#123834] text-white'
              : 'border-[#1f7a6c]/35 bg-[#0d2a28] text-white'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">{title}</p>
          <p className="mt-5 text-sm leading-relaxed text-white/85">{detail}</p>
        </div>
      </div>
    </button>
  )
}

export function HealthDiagram() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <FlipCard
        title="Project health"
        detail="BuildWyse continuously assesses delivery health from phase progress, approvals, rejections, milestone pressure, and communication activity. Scores update as work moves so clients and freelancers can intervene early when risk rises, instead of discovering problems only at final review."
        front={
          <>
            <p className="text-center text-sm font-semibold text-[#0d2a28]">Project health</p>
            <svg viewBox="0 0 260 220" className="mx-auto mt-2 w-full max-w-[240px]" role="img" aria-label="Health score dial">
              <path d="M40 170 A90 90 0 1 1 220 170" fill="none" stroke="#e6eeee" strokeWidth="16" strokeLinecap="round" />
              <path
                className="bw-draw"
                d="M40 170 A90 90 0 1 1 198 95"
                fill="none"
                stroke="#1f7a6c"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <text x="130" y="145" textAnchor="middle" fill="#0d2a28" fontSize="42" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700">
                86
              </text>
              <text x="130" y="172" textAnchor="middle" fill="#5b6b73" fontSize="13" fontFamily="Manrope, sans-serif">
                healthy
              </text>
            </svg>
            <p className="text-center text-sm text-[var(--color-muted-foreground)]">
              Live assessment from phases, approvals, rejections, and communication signals.
            </p>
          </>
        }
      />

      <FlipCard
        title="Change control"
        detail="When scope evolves, CRMS captures the request, runs AI impact analysis on cost and timeline, and routes approval into a new baseline. That keeps change formal and auditable, preventing informal chat decisions from silently rewriting delivery commitments."
        front={
          <>
            <p className="text-center text-sm font-semibold text-[#0d2a28]">Change control</p>
            <svg viewBox="0 0 280 200" className="mx-auto mt-3 w-full" role="img" aria-label="Change request flow diagram">
              <rect className="bw-node" x="20" y="20" width="100" height="40" rx="12" fill="#eef7f5" stroke="#1f7a6c" />
              <text x="70" y="45" textAnchor="middle" fill="#0d2a28" fontSize="13" fontFamily="Manrope, sans-serif">Request</text>
              <path className="bw-flow-line" d="M120 40 H160" stroke="#1f7a6c" strokeWidth="2" fill="none" />
              <rect className="bw-node" x="160" y="20" width="100" height="40" rx="12" fill="#0d2a28" />
              <text x="210" y="45" textAnchor="middle" fill="white" fontSize="13" fontFamily="Manrope, sans-serif">AI Impact</text>
              <path className="bw-flow-line" d="M210 60 V95" stroke="#1f7a6c" strokeWidth="2" fill="none" />
              <rect className="bw-node" x="160" y="95" width="100" height="40" rx="12" fill="#eef7f5" stroke="#c4a574" />
              <text x="210" y="120" textAnchor="middle" fill="#0d2a28" fontSize="13" fontFamily="Manrope, sans-serif">Approve</text>
              <path className="bw-flow-line" d="M160 115 H70 V150" stroke="#1f7a6c" strokeWidth="2" fill="none" />
              <rect className="bw-node" x="20" y="150" width="100" height="40" rx="12" fill="#fff8ef" stroke="#c4a574" />
              <text x="70" y="175" textAnchor="middle" fill="#0d2a28" fontSize="13" fontFamily="Manrope, sans-serif">Baseline+</text>
            </svg>
            <p className="mt-2 text-center text-sm text-[var(--color-muted-foreground)]">
              Scope changes become structured CRMS records with impact analysis.
            </p>
          </>
        }
      />

      <FlipCard
        dark
        title="Certificate closeout"
        detail="On successful completion, BuildWyse issues a persisted Certificate of Completion with status, ledger identity, and public verification. Clients and freelancers keep a durable closeout artifact that can be downloaded as PDF and referenced beyond the project workspace."
        front={
          <>
            <p className="text-center text-sm font-semibold text-[#8fd4c5]">Certificate closeout</p>
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 px-5 py-7 text-center">
              <div className="bw-pulse mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#8fd4c5]/50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3l2.2 4.6L19 8.3l-3.5 3.4.8 4.8L12 14.8 7.7 16.5l.8-4.8L5 8.3l4.8-.7L12 3z" stroke="#8fd4c5" strokeWidth="1.5" />
                </svg>
              </div>
              <p className="mt-3 font-display text-lg font-semibold">Certificate of Completion</p>
              <p className="mt-2 text-sm text-white/60">Issued, stored, and downloadable as a BuildWyse PDF record.</p>
              <div className="mt-5 space-y-2 text-left text-xs text-white/55">
                <div className="flex justify-between border-b border-dashed border-white/15 pb-2"><span>Status</span><span className="text-white">Issued</span></div>
                <div className="flex justify-between border-b border-dashed border-white/15 pb-2"><span>Ledger</span><span className="text-white">Persisted</span></div>
                <div className="flex justify-between"><span>Verify</span><span className="text-white">Public lookup</span></div>
              </div>
            </div>
          </>
        }
      />
    </div>
  )
}
