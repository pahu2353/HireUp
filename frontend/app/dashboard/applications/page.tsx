"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAuth, getUserApplications } from "@/lib/api"
import { toast } from "sonner"

interface Application {
  id: string
  user_id: string
  job_id: string
  status: string
  created_at: string
  title: string
  location: string
  salary_range: string
  company_name: string
}

function toApplicantStatus(status: string): string {
  const normalized = (status || "").toLowerCase()
  if (normalized === "rejected_pre_interview" || normalized === "rejected_post_interview") {
    return "Rejected"
  }
  if (normalized === "in_progress") return "In Progress"
  if (normalized === "offer") return "Offer"
  if (normalized === "submitted") return "Applied"
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Applied"
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "in progress":
    case "interview scheduled":
      return "bg-primary/10 text-primary"
    case "applied":
    case "submitted":
    case "under review":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
    case "offer":
      return "bg-green-500/10 text-green-600 dark:text-green-400"
    case "rejected":
      return "bg-red-500/10 text-red-600 dark:text-red-400"
    default:
      return "bg-secondary text-muted-foreground"
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    })
  } catch {
    return dateString
  }
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "user") {
      window.location.href = "/login"
      return
    }
    const load = () =>
      getUserApplications(auth.id)
        .then(setApplications)
        .catch(() => toast.error("Failed to load applications"))
        .finally(() => setLoading(false))
    load()
    const intervalId = window.setInterval(load, 5000)
    return () => window.clearInterval(intervalId)
  }, [])

  if (loading) {
    return (
      <DashboardShell role="applicant">
        <p className="text-muted-foreground">Loading applications...</p>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="applicant">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="mt-1 text-muted-foreground">
          Track the status of your applications.
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">
              You haven{"'"}t applied to any jobs yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <span className="text-sm font-bold text-foreground">
                        {app.company_name?.charAt(0) ?? "C"}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{app.title}</CardTitle>
                      <CardDescription>{app.company_name || "Company"}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(toApplicantStatus(app.status))}>
                    {toApplicantStatus(app.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Applied on {formatDate(app.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
