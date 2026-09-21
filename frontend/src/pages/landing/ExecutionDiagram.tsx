import { useState, type ReactNode } from 'react'

function FlipPanel({
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
          className={`absolute inset-0 overflow-hidden rounded-[28px] border p-6 [backface-visibility:hidden] sm:p-8 ${
            dark ? 'border-[#d5e2e0] bg-[#0d2a28] text-white' : 'border-[#d5e2e0] bg-[#fbfcfc]'
          }`}
        >
          {front}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-[#1f7a6c]/35 bg-[#0d2a28] p-8 text-center text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">{title}</p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/85">{detail}</p>
        </div>
      </div>
    </button>
  )
}

export function ExecutionDiagram() {
  const bars = [42, 68, 55, 84, 73, 91, 62, 78]

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <FlipPanel
        title="Execution graph"
        detail="BuildWyse turns delivery into a living graph of phases, milestones, evidence, and verification gates. Each node advances only when proof is attached and reviewed, so status is never a spreadsheet guess — it is a connected record of completed work."
        front={
          <svg viewBox="0 0 720 340" className="h-[320px] w-full" role="img" aria-label="Execution graph of phases and milestones">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#1f7a6c" />
              </marker>
            </defs>
            <text x="24" y="55" fill="#5b6b73" fontSize="12" fontFamily="Manrope, sans-serif">Phase A</text>
            <text x="24" y="135" fill="#5b6b73" fontSize="12" fontFamily="Manrope, sans-serif">Phase B</text>
            <text x="24" y="215" fill="#5b6b73" fontSize="12" fontFamily="Manrope, sans-serif">Evidence</text>
            <text x="24" y="295" fill="#5b6b73" fontSize="12" fontFamily="Manrope, sans-serif">Verify</text>
            {[55, 135, 215, 295].map((y) => (
              <line key={y} x1="90" y1={y} x2="690" y2={y} stroke="#e2eaea" strokeWidth="2" />
            ))}
            <path className="bw-flow-line" d="M160 55 H300" stroke="#1f7a6c" strokeWidth="2.5" markerEnd="url(#arrow)" fill="none" />
            <path className="bw-flow-line" d="M300 55 V135 H430" stroke="#1f7a6c" strokeWidth="2.5" markerEnd="url(#arrow)" fill="none" />
            <path className="bw-flow-line" d="M430 135 V215 H560" stroke="#1f7a6c" strokeWidth="2.5" markerEnd="url(#arrow)" fill="none" />
            <path className="bw-flow-line" d="M560 215 V295 H660" stroke="#1f7a6c" strokeWidth="2.5" markerEnd="url(#arrow)" fill="none" />
            {[
              { x: 140, y: 55, label: 'Scope' },
              { x: 300, y: 55, label: 'Design' },
              { x: 430, y: 135, label: 'Build' },
              { x: 560, y: 215, label: 'Proof' },
              { x: 660, y: 295, label: 'Pass' },
            ].map((n, i) => (
              <g key={n.label} className="bw-node" style={{ animationDelay: `${i * 0.12}s` }}>
                <rect x={n.x - 46} y={n.y - 22} width="92" height="44" rx="12" fill="white" stroke="#1f7a6c" strokeWidth="1.5" />
                <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#0d2a28" fontSize="14" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600">
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        }
      />

      <FlipPanel
        dark
        title="Delivery cadence"
        detail="Velocity signals summarize throughput across recent execution windows so teams can see whether delivery is accelerating, stalling, or recovering. Animated cadence bars make operational rhythm visible without opening every phase detail."
        front={
          <>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#8fd4c5]">Velocity signal</p>
            <h3 className="mt-3 text-center font-display text-2xl font-semibold">Delivery cadence</h3>
            <p className="mt-2 text-center text-sm text-white/65">Animated throughput across recent execution windows.</p>
            <div className="mt-8 flex h-44 items-end gap-3">
              {bars.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end rounded bg-white/5">
                    <div
                      className="bw-bar w-full rounded bg-gradient-to-t from-[#1f7a6c] to-[#8fd4c5]"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        }
      />
    </div>
  )
}
