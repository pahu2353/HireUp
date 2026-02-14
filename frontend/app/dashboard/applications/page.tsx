"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const MOCK_APPLICATIONS = [
  {
    id: "1",
    company: "Dataflow Labs",
    title: "Full-Stack Engineer",
    appliedDate: "Feb 12, 2026",
    status: "Interview Scheduled",
    statusColor: "bg-primary/10 text-primary",
  },
  {
    id: "2",
    company: "Nexus AI",
    title: "ML Infrastructure Engineer",
    appliedDate: "Feb 11, 2026",
    status: "Under Review",
    statusColor: "bg-yellow-500/10 text-yellow-400",
  },
  {
    id: "3",
    company: "ClearBit",
    title: "Backend Engineer",
    appliedDate: "Feb 10, 2026",
    status: "Applied",
    statusColor: "bg-secondary text-muted-foreground",
  },
]

export default function ApplicationsPage() {
  return (
    <DashboardShell role="applicant">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="mt-1 text-muted-foreground">
          Track the status of your applications.
        </p>
      </div>

      {MOCK_APPLICATIONS.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">
              You haven{"'"}t applied to any jobs yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {MOCK_APPLICATIONS.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <span className="text-sm font-bold text-foreground">
                        {app.company.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{app.title}</CardTitle>
                      <CardDescription>{app.company}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={app.statusColor}
                  >
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Applied on {app.appliedDate}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
