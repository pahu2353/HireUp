"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CompanyProfilePage() {
  return (
    <DashboardShell role="company">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your company information visible to applicants.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-name">Company Name</Label>
              <Input id="cp-name" defaultValue="Dataflow Labs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-website">Website</Label>
              <Input
                id="cp-website"
                defaultValue="https://dataflowlabs.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp-size">Company Size</Label>
                <Input id="cp-size" defaultValue="25-50 employees" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-stage">Stage</Label>
                <Input id="cp-stage" defaultValue="Series A" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              defaultValue="Dataflow Labs is building the next generation of real-time data infrastructure. We help companies process and analyze streaming data at scale, enabling faster decisions and better outcomes."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Culture & Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              defaultValue="Remote-first, async communication, unlimited PTO, competitive equity, annual team retreats, learning budget, top-tier health insurance."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Button>Save Changes</Button>
      </div>
    </DashboardShell>
  )
}
