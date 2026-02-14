"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  MapPin,
  DollarSign,
  Clock,
  CheckCircle2,
  Briefcase,
} from "lucide-react"

const MOCK_MATCHED_JOBS = [
  {
    id: "1",
    company: "Dataflow Labs",
    title: "Full-Stack Engineer",
    location: "San Francisco, CA",
    salary: "$140k - $180k",
    type: "Full-time",
    matchScore: 96,
    tags: ["React", "TypeScript", "Python", "PostgreSQL"],
    description:
      "Build and scale our real-time data processing platform. You'll work across the stack from React frontends to Python backends.",
    posted: "2 days ago",
  },
  {
    id: "2",
    company: "Nexus AI",
    title: "ML Infrastructure Engineer",
    location: "Remote",
    salary: "$160k - $200k",
    type: "Full-time",
    matchScore: 92,
    tags: ["Python", "Kubernetes", "Docker", "AWS"],
    description:
      "Help us build the infrastructure that powers next-gen AI models. Scale training pipelines and inference systems.",
    posted: "1 day ago",
  },
  {
    id: "3",
    company: "ClearBit",
    title: "Backend Engineer",
    location: "New York, NY",
    salary: "$130k - $165k",
    type: "Full-time",
    matchScore: 89,
    tags: ["Go", "PostgreSQL", "GraphQL", "Docker"],
    description:
      "Design and implement APIs that handle millions of enrichment requests daily. Focus on performance and reliability.",
    posted: "3 days ago",
  },
  {
    id: "4",
    company: "Verdi Health",
    title: "Frontend Engineer",
    location: "Toronto, ON",
    salary: "CAD $110k - $140k",
    type: "Full-time",
    matchScore: 85,
    tags: ["React", "TypeScript", "Next.js", "Tailwind"],
    description:
      "Build beautiful, accessible healthcare interfaces that make a real difference in patients' lives.",
    posted: "5 days ago",
  },
  {
    id: "5",
    company: "Automata",
    title: "Software Engineer Intern",
    location: "Waterloo, ON",
    salary: "CAD $6k/mo",
    type: "Internship",
    matchScore: 82,
    tags: ["React", "Node.js", "AWS"],
    description:
      "Join a fast-growing startup and ship production features from day one. Strong mentorship and ownership.",
    posted: "1 day ago",
  },
]

export default function ApplicantDashboard() {
  const [appliedJobs, setAppliedJobs] = useState<string[]>([])
  const maxApplications = 5
  const remainingApplications = maxApplications - appliedJobs.length

  const handleApply = (jobId: string) => {
    if (!appliedJobs.includes(jobId) && appliedJobs.length < maxApplications) {
      setAppliedJobs([...appliedJobs, jobId])
    }
  }

  return (
    <DashboardShell role="applicant">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Your Matched Jobs
        </h1>
        <p className="mt-1 text-muted-foreground">
          These jobs were selected for you based on your skills, interests, and
          fit. You have{" "}
          <span className="font-semibold text-primary">
            {remainingApplications} application{remainingApplications !== 1 ? "s" : ""}
          </span>{" "}
          remaining today.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {appliedJobs.length}/{maxApplications}
          </span>
          <span className="text-sm text-muted-foreground">applied today</span>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_MATCHED_JOBS.map((job) => {
          const hasApplied = appliedJobs.includes(job.id)
          return (
            <Card key={job.id} className="transition-colors hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        <span className="text-sm font-bold text-foreground">
                          {job.company.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {job.company}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 px-3 py-1">
                      <span className="text-sm font-semibold text-primary">
                        {job.matchScore}% match
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  {job.description}
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      {job.salary}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {job.posted}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApply(job.id)}
                    disabled={hasApplied || remainingApplications === 0}
                    variant={hasApplied ? "secondary" : "default"}
                  >
                    {hasApplied ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Applied
                      </>
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </DashboardShell>
  )
}
