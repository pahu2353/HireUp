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
    <section id="how-it-works" className="relative px-6 py-20 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl md:mb-14">
          <div className="eyebrow">The Hiring Bottleneck</div>
          <h2 className="section-title mt-5">
            Fast-growing teams waste cycles on low-signal recruiting.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            The current loop rewards volume, not relevance. Everyone over-applies,
            recruiters over-filter, and strong candidates slip through.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="app-shell p-7 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12">
                <problem.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
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
