import { useState } from 'react'

export function MatchingDiagram() {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <button
        type="button"
        aria-pressed={flipped}
        onClick={() => setFlipped((v) => !v)}
        className="relative mx-auto h-[420px] w-full max-w-[520px] text-left"
        style={{ perspective: '1200px' }}
      >
        <div
          className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front — DNA score engine */}
          <div className="absolute inset-0 rounded-2xl border border-white/12 bg-white/[0.04] [backface-visibility:hidden]">
            <svg viewBox="0 0 520 420" className="h-full w-full" role="img" aria-label="Requirement DNA to Expertise DNA matching diagram">
              <defs>
                <linearGradient id="dnaA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8fd4c5" />
                  <stop offset="100%" stopColor="#1f7a6c" />
                </linearGradient>
                <linearGradient id="dnaB" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4a574" />
                  <stop offset="100%" stopColor="#8a6a3d" />
                </linearGradient>
              </defs>

              <text x="120" y="70" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="13" fontFamily="Manrope, sans-serif">
                Requirement DNA
              </text>
              <text x="400" y="70" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="13" fontFamily="Manrope, sans-serif">
                Expertise DNA
              </text>

              <path
                className="bw-draw"
                d="M120 90 C 90 140, 150 180, 120 230 C 90 280, 150 320, 120 360"
                stroke="url(#dnaA)"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="bw-draw"
                d="M400 90 C 430 140, 370 180, 400 230 C 430 280, 370 320, 400 360"
                stroke="url(#dnaB)"
                strokeWidth="4"
                fill="none"
                style={{ animationDelay: '0.25s' }}
              />

              {[110, 160, 210, 260, 310, 350].map((y, i) => (
                <g key={y}>
                  <line
                    className="bw-pulse"
                    x1="120"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth="2"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                  <circle cx="120" cy={y} r="6" fill="#8fd4c5" />
                  <circle cx="400" cy={y} r="6" fill="#c4a574" />
                </g>
              ))}

              <g className="bw-node" style={{ animationDelay: '0.5s' }}>
                <rect x="190" y="185" width="140" height="50" rx="14" fill="#0d2a28" stroke="rgba(255,255,255,0.2)" />
                <text x="260" y="215" textAnchor="middle" fill="white" fontSize="14" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600">
                  Score Engine
                </text>
              </g>
            </svg>
          </div>

          {/* Back — detailed description */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[#8fd4c5]/35 bg-[#0d2a28] p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4c5]">Score Engine</p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">How DNA matching works</h3>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80">
              BuildWyse compares Requirement DNA with Expertise DNA across skills overlap, experience depth,
              verification strength, and semantic similarity. Each freelancer receives a transparent score explanation,
              then the platform ranks a durable Top 10 shortlist that persists in your project until you explicitly
              re-run matching after scope changes.
            </p>
          </div>
        </div>
      </button>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-5 text-left lg:mx-0 lg:max-w-none">
        {[
          { label: 'Skills overlap', value: 92 },
          { label: 'Experience fit', value: 78 },
          { label: 'Verification weight', value: 85 },
          { label: 'Semantic similarity', value: 71 },
        ].map((row, i) => (
          <div key={row.label} className="bw-rise" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/75">{row.label}</span>
              <span className="font-semibold text-white">{row.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-white/10">
              <div
                className="bw-bar h-full rounded bg-gradient-to-r from-[#8fd4c5] to-[#c4a574]"
                style={{ width: `${row.value}%`, animationDelay: `${0.2 + i * 0.12}s` }}
              />
            </div>
          </div>
        ))}
        <p className="mt-2 text-center text-sm leading-relaxed text-white/60 lg:text-left">
          Rankings persist in your project workspace. Re-run matching only when requirements change.
        </p>
      </div>
    </div>
  )
}
