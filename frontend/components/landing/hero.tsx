import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

function CurvedGrid() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--grid-color))" stopOpacity="0.08" />
          <stop offset="60%" stopColor="hsl(var(--grid-color))" stopOpacity="0.03" />
          <stop offset="100%" stopColor="hsl(var(--grid-color))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Horizontal curved lines */}
      {[...Array(8)].map((_, i) => {
        const y = 80 + i * 90
        return (
          <path
            key={`h-${i}`}
            d={`M 0 ${y} Q 50% ${y - 30 + i * 6}, 100% ${y}`}
            fill="none"
            stroke="url(#grid-fade)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {/* Vertical curved lines */}
      {[...Array(12)].map((_, i) => {
        const x = `${(i + 1) * 8}%`
        return (
          <path
            key={`v-${i}`}
            d={`M ${x} 0 Q ${parseInt(x) + 2}% 50%, ${x} 100%`}
            fill="none"
            stroke="url(#grid-fade)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20">
      {/* Curved grid background */}
      <div className="absolute inset-0 -z-10">
        <CurvedGrid />
      </div>

      {/* Gradient orbs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent blur-[100px]" />
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-destructive/20 via-destructive/5 to-transparent blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-gradient-to-r from-secondary to-secondary/50 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Powered by Two-Tower AI Matching
          </span>
        </div>

        <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          <span className="text-foreground">Stop spam applying.</span>
          <br />
          <span className="bg-gradient-to-r from-foreground from-40% via-primary via-75% to-destructive bg-clip-text text-transparent">
            Start getting matched.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
          HireUp uses a novel two-tower recommendation model to connect the
          right talent with the right companies. Quality over quantity. Signal
          over noise.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70" asChild>
            <Link href="/signup">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">See How It Works</Link>
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard number="75%" label="of applicants are unqualified noise" />
          <StatCard number="3,000+" label="avg. applications per student" />
          <StatCard number="50x" label="noise reduction with HireUp" />
        </div>
      </div>
    </section>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-card to-card/50 p-6 text-left backdrop-blur-sm">
      <p className="text-3xl font-bold text-primary">{number}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
