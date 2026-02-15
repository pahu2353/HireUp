"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, MessageSquare, TrendingUp, Users } from "lucide-react"
import { getAuth } from "@/lib/api"
import { CompanyDashboardResponse, getCompanyDashboard } from "@/lib/company-api"

const statConfig = [
  { label: "Active Postings", key: "active_postings", icon: FileText },
  { label: "Total Applicants", key: "total_applicants", icon: Users },
  { label: "AI Agent Queries", key: "ai_agent_queries", icon: MessageSquare },
  { label: "Interview Rate", key: "interview_rate_percent", icon: TrendingUp },
] as const

export default function CompanyDashboard() {
  const [dashboard, setDashboard] = useState<CompanyDashboardResponse | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to view dashboard data.")
      return
    }
    const load = () =>
      getCompanyDashboard(auth.id)
        .then((data) => setDashboard(data))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"))
    load()
    const id = window.setInterval(load, 5000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <DashboardShell role="company">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Live overview from company backend endpoints.
        </p>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfig.map((stat) => {
          let value = "0"
          let change = "No recent updates"
          if (dashboard) {
            if (stat.key === "interview_rate_percent") {
              value = `${dashboard.stats.interview_rate_percent}%`
              change = "Based on feedback vs interview list"
            } else {
              value = String(dashboard.stats[stat.key])
              change = "From current company activity"
            }
          }
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Workflow</CardTitle>
            <CardDescription>Live counts by stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded border p-3 text-sm">Submitted: {dashboard?.workflow.submitted ?? 0}</div>
              <div className="rounded border p-3 text-sm">Rejected (Pre): {dashboard?.workflow.rejected_pre_interview ?? 0}</div>
              <div className="rounded border p-3 text-sm">In Progress: {dashboard?.workflow.in_progress ?? 0}</div>
              <div className="rounded border p-3 text-sm">Rejected (Post): {dashboard?.workflow.rejected_post_interview ?? 0}</div>
              <div className="rounded border p-3 text-sm">Offer: {dashboard?.workflow.offer ?? 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your backend-tracked hiring pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboard?.recent_activity ?? []).map((activity, i) => (
                <div
                  key={`${activity.time}-${i}`}
                  className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.detail}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(activity.time).toLocaleString()}
                  </span>
                </div>
              ))}
              {!dashboard?.recent_activity?.length ? (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
