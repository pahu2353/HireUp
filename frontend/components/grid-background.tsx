export function GridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-20"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--grid-color) / 0.12) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--grid-color) / 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "58px 58px",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04] dark:opacity-[0.08]"
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
        {[...Array(7)].map((_, i) => {
          const yPct = 8 + i * 14
          return (
            <path
              key={`h-${i}`}
              d={`M 0 ${yPct}% Q 30% ${yPct - 2 + i * 0.45}%, 58% ${yPct + 0.2}% T 100% ${yPct}%`}
              fill="none"
              stroke="url(#grid-h-fade)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
        {[...Array(9)].map((_, i) => {
          const xPct = 6 + i * 11
          return (
            <path
              key={`v-${i}`}
              d={`M ${xPct}% 0 Q ${xPct + 1}% 24%, ${xPct - 0.5}% 54% T ${xPct}% 100%`}
              fill="none"
              stroke="url(#grid-v-fade)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>

      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
