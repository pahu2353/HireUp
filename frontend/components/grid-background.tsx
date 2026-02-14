export function GridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-20"
      aria-hidden="true"
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--grid-color)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--grid-color)) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Curved horizontal accent lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04] dark:opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grid-h-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--grid-color))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--grid-color))" stopOpacity="1" />
            <stop offset="70%" stopColor="hsl(var(--grid-color))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--grid-color))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grid-v-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--grid-color))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--grid-color))" stopOpacity="1" />
            <stop offset="70%" stopColor="hsl(var(--grid-color))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--grid-color))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Horizontal curved lines */}
        {[...Array(6)].map((_, i) => {
          const yPct = 12 + i * 16
          return (
            <path
              key={`h-${i}`}
              d={`M 0 ${yPct}% Q 25% ${yPct - 2 + i * 0.5}%, 50% ${yPct}% T 100% ${yPct}%`}
              fill="none"
              stroke="url(#grid-h-fade)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
        {/* Vertical curved lines */}
        {[...Array(8)].map((_, i) => {
          const xPct = 8 + i * 12
          return (
            <path
              key={`v-${i}`}
              d={`M ${xPct}% 0 Q ${xPct + 1}% 25%, ${xPct}% 50% T ${xPct}% 100%`}
              fill="none"
              stroke="url(#grid-v-fade)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>

      {/* Top radial fade */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
      {/* Bottom radial fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
