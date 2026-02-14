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
import { Checkbox } from "@/components/ui/checkbox"
import { UserCheck, Send } from "lucide-react"

interface Candidate {
  id: string
  name: string
  matchScore: number
  skills: string[]
  summary: string
  status: "matched" | "shortlisted" | "interview" | "rejected"
}

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: "1",
    name: "Sarah Kim",
    matchScore: 96,
    skills: ["React", "TypeScript", "Python", "PostgreSQL"],
    summary:
      "4th year CS student at Waterloo. Built real-time analytics dashboards at Shopify. Strong full-stack with emphasis on frontend performance.",
    status: "matched",
  },
  {
    id: "2",
    name: "Michael Rodriguez",
    matchScore: 93,
    skills: ["React", "TypeScript", "Go", "Docker"],
    summary:
      "2 years at a YC startup. Led migration from monolith to microservices. Excellent system design and communication skills.",
    status: "matched",
  },
  {
    id: "3",
    name: "Emily Zhang",
    matchScore: 91,
    skills: ["Python", "AWS", "TypeScript", "Kubernetes"],
    summary:
      "ML platform engineer at a mid-stage startup. Built end-to-end training pipelines. Strong in both ML and traditional software engineering.",
    status: "shortlisted",
  },
  {
    id: "4",
    name: "David Park",
    matchScore: 89,
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    summary:
      "Full-stack developer with 3 years experience. Shipped multiple production apps. Active open-source contributor.",
    status: "matched",
  },
  {
    id: "5",
    name: "Priya Patel",
    matchScore: 87,
    skills: ["React", "Python", "AWS", "GraphQL"],
    summary:
      "3rd year CS student at UofT. Interned at two FAANG companies. Strong algorithmic skills and product sense.",
    status: "interview",
  },
  {
    id: "6",
    name: "James Chen",
    matchScore: 85,
    skills: ["Go", "Rust", "Docker", "PostgreSQL"],
    summary:
      "Systems-focused engineer. Built high-throughput data pipelines. Passionate about performance and reliability.",
    status: "matched",
  },
]

const statusLabels: Record<Candidate["status"], { label: string; className: string }> = {
  matched: { label: "Matched", className: "bg-secondary text-muted-foreground" },
  shortlisted: { label: "Shortlisted", className: "bg-primary/10 text-primary" },
  interview: { label: "Interview", className: "bg-yellow-500/10 text-yellow-400" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
}

export default function CandidatesPage() {
  const [selected, setSelected] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <DashboardShell role="company">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Top Candidates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Candidates matched by our two-tower model, ranked by fit.
          </p>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selected.length} selected
            </span>
            <Button size="sm">
              <Send className="mr-1 h-3.5 w-3.5" />
              Submit Interview List
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {MOCK_CANDIDATES.map((candidate) => {
          const statusInfo = statusLabels[candidate.status]
          return (
            <Card
              key={candidate.id}
              className={
                selected.includes(candidate.id)
                  ? "border-primary/30"
                  : ""
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selected.includes(candidate.id)}
                    onCheckedChange={() => toggleSelect(candidate.id)}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <UserCheck className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {candidate.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={statusInfo.className}
                        >
                          {statusInfo.label}
                        </Badge>
                        <div className="rounded-full bg-primary/10 px-2.5 py-0.5">
                          <span className="text-xs font-semibold text-primary">
                            {candidate.matchScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-0.5">
                      {candidate.summary}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-[4.5rem]">
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </DashboardShell>
  )
}
