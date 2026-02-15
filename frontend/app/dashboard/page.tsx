"use client"

import { useEffect, useState } from "react"
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
  Briefcase,
  CheckCircle2,
} from "lucide-react"
import { getAuth, getMatchedJobs, applyJob, getUserApplications } from "@/lib/api"
import { toast } from "sonner"

interface Job {
  id: string
  company_id: string
  title: string
  description: string
  skills: string[]
  location: string
  salary_range: string
  status: string
  created_at: string
  company_name: string
  applied: boolean
  application_status?: string
}

interface UserApplication {
  id: string
  user_id: string
  job_id: string
  status: string
}

function toApplicantStatus(status?: string): string {
  const normalized = (status || "").toLowerCase()
  if (normalized === "rejected_pre_interview" || normalized === "rejected_post_interview") return "Rejected"
  if (normalized === "in_progress") return "In Progress"
  if (normalized === "offer") return "Offer"
  if (normalized === "submitted") return "Applied"
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Applied"
}

export default function ApplicantDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const maxApplications = 5
  const appliedCount = jobs.filter(j => j.applied).length
  const remainingApplications = maxApplications - appliedCount

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "user") {
      window.location.href = "/login"
      return
    }
    setUserId(auth.id)
    const load = async () => {
      try {
        const [matchedJobs, apps] = await Promise.all([
          getMatchedJobs(auth.id),
          getUserApplications(auth.id) as Promise<UserApplication[]>,
        ])
        const byJobId = new Map(apps.map((a) => [a.job_id, a.status]))
        const enriched = matchedJobs.map((job: Job) => ({
          ...job,
          applied: Boolean(byJobId.get(job.id) || job.applied),
          application_status: byJobId.get(job.id),
        }))
        setJobs(enriched)
      } catch {
        toast.error("Failed to load matched jobs")
      } finally {
        setLoading(false)
      }
    }
    load()
    const intervalId = window.setInterval(load, 5000)
    return () => window.clearInterval(intervalId)
  }, [])

  const handleApply = async (jobId: string) => {
    if (!userId) return
    try {
      await applyJob(userId, jobId)
      setJobs(
        jobs.map((j) =>
          j.id === jobId ? { ...j, applied: true, application_status: "submitted" } : j
        )
      )
      toast.success("Application submitted successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply")
    }
  }

  if (loading) {
    return (
      <DashboardShell role="applicant">
        <p className="text-muted-foreground">Loading matched jobs...</p>
      </DashboardShell>
    )
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
            {appliedCount}/{maxApplications}
          </span>
          <span className="text-sm text-muted-foreground">applied today</span>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No job postings available yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const hasApplied = job.applied
            const statusLabel = toApplicantStatus(job.application_status)
            return (
              <Card key={job.id} className="transition-colors hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <span className="text-sm font-bold text-foreground">
                            {job.company_name?.charAt(0) ?? "C"}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {job.company_name || "Company"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    {job.description || "No description available."}
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
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
                        {job.salary_range}
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
                          {statusLabel}
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
      )}
    </DashboardShell>
  )
}
