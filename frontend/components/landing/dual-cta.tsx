import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Building2, User } from "lucide-react"

export function DualCTA() {
  return (
    <section className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <div className="eyebrow">Choose Your Side</div>
          <h2 className="section-title mt-5">
            One platform, two high-signal workflows.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div
            id="for-companies"
            className="app-shell bg-gradient-to-br from-card via-card to-primary/5 p-8 md:p-10"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              For Companies
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Post a job and let our two-tower model cut 2,000 applicants down
              to 50 great fits. Then use our AI agent to analyze and rank them
              based on exactly what you need.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "AI-powered candidate analysis",
                "Interactive recruiter chatbot",
                "Two-way feedback loop",
                "Interview list management",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="mt-8 rounded-full px-6" asChild>
              <Link href="/signup?role=company">
                Start Hiring
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div
            id="for-applicants"
            className="app-shell bg-gradient-to-br from-card via-card to-chart-2/10 p-8 md:p-10"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              For Applicants
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              No more spray and pray. Get matched with jobs that actually fit
              your skills, interests, and career goals. Every application you
              send is one that matters.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Curated daily job matches",
                "Quality over quantity applications",
                "Skill and interest-based matching",
                "Real feedback from companies",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="mt-8 rounded-full px-6" variant="outline" asChild>
              <Link href="/signup?role=applicant">
                Find Your Match
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
