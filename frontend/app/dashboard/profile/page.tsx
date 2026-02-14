"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ApplicantProfilePage() {
  return (
    <DashboardShell role="applicant">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Keep your profile up to date for better matches.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-first">First Name</Label>
                <Input id="p-first" defaultValue="Jane" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-last">Last Name</Label>
                <Input id="p-last" defaultValue="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" defaultValue="jane@example.com" readOnly className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-objective">Career Objective</Label>
              <Input
                id="p-objective"
                defaultValue="Full-stack SWE at an early-stage startup"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume / Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              defaultValue="3rd year CS student at University of Waterloo with 4 co-op terms. Experience in React, TypeScript, Python, and AWS. Built production systems handling 10k+ daily users."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["React", "TypeScript", "Python", "AWS", "PostgreSQL", "Node.js", "Docker"].map(
                (skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Button>Save Changes</Button>
      </div>
    </DashboardShell>
  )
}
