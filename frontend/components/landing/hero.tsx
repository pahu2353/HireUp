import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"

const trustSignals = [
  "Two-tower matching for both sides of the market",
  "Iris recruiter agent with transparent reasoning",
  "Built to reduce hiring noise, not increase it",
]

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-36 md:pt-44">
      <div className="absolute inset-x-0 top-0 -z-10 h-[580px] bg-gradient-to-b from-primary/12 via-primary/5 to-transparent" />
      <div className="absolute -right-16 top-28 -z-10 h-64 w-64 rounded-full bg-chart-2/15 blur-3xl" />
      <div className="absolute -left-20 top-44 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto max-w-7xl">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-7">
            <div className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Recruiting velocity, minus the noise
            </div>

            <h1 className="text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-6xl md:text-7xl">
              Hire right,
              <br />
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                HireUp.
              </span>
            </h1>

            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              HireUp turns chaotic recruiting into a structured signal engine.
              Applicants get curated matches, and companies get ranked
              candidates they can trust.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full px-7" asChild>
                <Link href="/signup">
                  Start Building Your Pipeline
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-7" asChild>
                <Link href="#how-it-works">See Product Walkthrough</Link>
              </Button>
            </div>
          </div>

          <div className="app-shell p-6 md:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Why teams switch
            </p>
            <div className="mt-6 space-y-4">
              {trustSignals.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <MetricCard value="50x" label="less screening noise" />
              <MetricCard value="2-way" label="matching feedback" />
              <MetricCard value="24/7" label="Iris assistance" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="panel-muted p-4 text-center">
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  )
}
