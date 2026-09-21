export function HeroBlueprint() {
  return (
    <div className="relative h-full min-h-[460px] w-full">
      <svg viewBox="0 0 640 520" className="h-full w-full" role="img" aria-label="BuildWyse execution blueprint">
        <defs>
          <linearGradient id="heroGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fd4c5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c4a574" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="panelFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#163f3b" />
            <stop offset="100%" stopColor="#0f2f2c" />
          </linearGradient>
        </defs>

        {/* Blueprint frame */}
        <rect x="24" y="28" width="592" height="464" rx="28" fill="url(#panelFill)" stroke="rgba(255,255,255,0.14)" />
        <path
          className="bw-draw"
          d="M72 120 H250 M72 160 H210 M72 200 H280"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="2"
          fill="none"
        />

        {/* Central spine */}
        <path
          className="bw-flow-line"
          d="M320 80 V440"
          stroke="url(#heroGlow)"
          strokeWidth="3"
          fill="none"
        />

        {/* Orbit rings */}
        <g className="bw-orbit" style={{ transformOrigin: '320px 260px' }}>
          <ellipse cx="320" cy="260" rx="180" ry="110" fill="none" stroke="rgba(143,212,197,0.35)" strokeWidth="1.5" />
          <circle cx="500" cy="260" r="7" fill="#8fd4c5" />
        </g>
        <g className="bw-orbit" style={{ transformOrigin: '320px 260px', animationDuration: '26s', animationDirection: 'reverse' }}>
          <ellipse cx="320" cy="260" rx="120" ry="180" fill="none" stroke="rgba(196,165,116,0.35)" strokeWidth="1.5" />
          <circle cx="320" cy="80" r="6" fill="#c4a574" />
        </g>

        {/* Nodes */}
        {[
          { x: 140, y: 150, label: 'Brief', delay: '0.1s' },
          { x: 500, y: 150, label: 'Match', delay: '0.25s' },
          { x: 140, y: 350, label: 'Build', delay: '0.4s' },
          { x: 500, y: 350, label: 'Certify', delay: '0.55s' },
        ].map((n) => (
          <g key={n.label} className="bw-node" style={{ animationDelay: n.delay }}>
            <rect x={n.x - 54} y={n.y - 28} width="108" height="56" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.22)" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fill="white" fontSize="16" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600">
              {n.label}
            </text>
          </g>
        ))}

        <circle className="bw-pulse" cx="320" cy="260" r="34" fill="rgba(143,212,197,0.18)" stroke="#8fd4c5" strokeWidth="2" />
        <text x="320" y="266" textAnchor="middle" fill="white" fontSize="13" fontFamily="Manrope, sans-serif" fontWeight="600">
          AI CORE
        </text>
      </svg>
    </div>
  )
}
