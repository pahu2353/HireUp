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
    title: "Iris Recruiting Copilot",
    description:
      "Iris parses validated applicant profiles, answers recruiter questions, and continuously surfaces the best-fit candidates for each role.",
    detail: "Because problems 1 and 2 are solved, Iris works with clean, trustworthy data.",
  },
]

export function Solution() {
  return (
    <section className="relative px-6 py-20 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl md:mb-14">
          <div className="eyebrow">The System</div>
          <h2 className="section-title mt-5">
            A focused recruiting engine built for startup execution speed.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            HireUp combines constrained applications, two-tower matching, and
            Iris, your AI recruiting copilot, to keep teams moving fast without hiring
            blind.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className="app-shell relative p-7"
            >
              <span className="font-mono text-xs tracking-[0.15em] text-primary">
                {solution.step}
              </span>
              <div className="mb-4 mt-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12">
                <solution.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {solution.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {solution.description}
              </p>
              <p className="border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground/75">
                {solution.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
