"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Users, MessageSquare, TrendingUp } from "lucide-react"

const stats = [
  {
    label: "Active Postings",
    value: "3",
    icon: FileText,
    change: "+1 this week",
  },
  {
    label: "Total Applicants",
    value: "147",
    icon: Users,
    change: "Filtered to 50 top fits",
  },
  {
    label: "AI Agent Queries",
    value: "24",
    icon: MessageSquare,
    change: "Last 7 days",
  },
  {
    label: "Interview Rate",
    value: "68%",
    icon: TrendingUp,
    change: "vs 12% industry avg",
  },
]

export default function CompanyDashboard() {
  return (
    <DashboardShell role="company">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back. Here{"'"}s an overview of your hiring pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your hiring pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  action: "New applicant matched",
                  detail: "Sarah K. matched to Full-Stack Engineer (96% fit)",
                  time: "2h ago",
                },
                {
                  action: "AI Agent completed search",
                  detail: 'Found 8 candidates matching "strong React + ML experience"',
                  time: "5h ago",
                },
                {
                  action: "Interview feedback submitted",
                  detail: "Michael R. - Backend Engineer: Strong technical, good culture fit",
                  time: "1d ago",
                },
                {
                  action: "New job posting live",
                  detail: "DevOps Engineer posting is now receiving matches",
                  time: "2d ago",
                },
              ].map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.detail}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
