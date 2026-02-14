import { Target, Layers, Bot } from "lucide-react"

const solutions = [
  {
    icon: Target,
    step: "01",
    title: "Scarcity Creates Quality",
    description:
      "Limited applications per day mean every application counts. Applicants are strategic, companies see only relevant candidates.",
    detail: "Inspired by WaterlooWorks — where constrained applications lead to better outcomes for everyone.",
  },
  {
    icon: Layers,
    step: "02",
    title: "Two-Tower Matching",
    description:
      "Our novel two-tower model learns from both sides. Applicants see companies they fit, companies see candidates who match. Continuous two-way feedback.",
    detail: "The same tech behind immersive content feeds on platforms like X and Instagram, adapted for hiring.",
  },
  {
    icon: Bot,
    step: "03",
    title: "AI Agent Recruiter",
    description:
      "An intelligent agent that parses validated applicant profiles, answers questions, and continuously searches for your ideal candidates.",
    detail: "Because problems 1 and 2 are solved, the AI works with clean, trustworthy data.",
  },
]

export function Solution() {
  return (
    <section className="relative px-6 py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-l from-primary/8 to-transparent blur-[100px]" />
      </div>
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
            The Solution
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Turning recruiters into 10x recruiters.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            HireUp is Cursor for hiring. We combine constrained applications,
            intelligent matching, and AI agents to fix the broken recruiting
            pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className="relative rounded-xl border border-border bg-gradient-to-b from-card to-card/50 p-8"
            >
              <span className="font-mono text-xs text-primary">
                {solution.step}
              </span>
              <div className="mt-4 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <solution.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {solution.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {solution.description}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground/70 border-t border-border pt-4">
                {solution.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
