import { Volume2, ShieldAlert, BrainCircuit } from "lucide-react"

const problems = [
  {
    icon: Volume2,
    title: "Volume Game",
    description:
      "Applicants spam 100s of applications. Companies get buried in 2000+ unqualified resumes. Nobody wins.",
  },
  {
    icon: ShieldAlert,
    title: "Too Much Misrepresentation",
    description:
      "When applying is free and easy, people embellish. Resumes become unreliable. The signal is lost.",
  },
  {
    icon: BrainCircuit,
    title: "Burden on One Person",
    description:
      "Recruiters sift through piles alone. The best candidates get buried under noise. Great matches are missed.",
  },
]

export function Problems() {
  return (
    <section id="how-it-works" className="relative px-6 py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/8 to-transparent blur-[100px]" />
      </div>
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
            The Problem
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Job applications are broken for everyone.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            The status quo incentivizes applicants to spam and embellish, while
            companies waste time sifting through noise. It{"'"}s a prisoner{"'"}s
            dilemma where everybody loses.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="group rounded-xl border border-border bg-gradient-to-b from-card to-card/50 p-8 transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <problem.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {problem.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
