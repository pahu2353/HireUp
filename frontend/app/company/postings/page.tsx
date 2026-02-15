"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Users } from "lucide-react"
import { getAuth } from "@/lib/api"
import { createCompanyJobPosting } from "@/lib/company-api"
import { CompanyPosting, getCompanyPostings, saveCompanyPostings } from "@/lib/company-jobs"

export default function PostingsPage() {
  const [companyId, setCompanyId] = useState("")
  const [postings, setPostings] = useState<CompanyPosting[]>([])
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newLocation, setNewLocation] = useState("Remote")
  const [newSalary, setNewSalary] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newRequirements, setNewRequirements] = useState("")
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to create and manage postings.")
      return
    }
    setCompanyId(auth.id)
    setPostings(getCompanyPostings(auth.id))
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim() || !companyId) return

    setError("")
    setIsCreating(true)
    try {
      const requirements = newRequirements
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)

      const response = await createCompanyJobPosting({
        company_id: companyId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        skills: requirements,
        location: newLocation.trim() || "Remote",
        salary_range: newSalary.trim() || "TBD",
      })

      const newPosting: CompanyPosting = {
        id: response.job_id,
        title: newTitle.trim(),
        location: newLocation.trim() || "Remote",
        salary: newSalary.trim() || "TBD",
        type: "Full-time",
        description: newDescription.trim(),
        requirements,
        applicantCount: 0,
        status: "active",
        companyId,
      }

      const next = [newPosting, ...postings]
      setPostings(next)
      saveCompanyPostings(companyId, next)

      setNewTitle("")
      setNewLocation("Remote")
      setNewSalary("")
      setNewDescription("")
      setNewRequirements("")
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create posting")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <DashboardShell role="company">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Postings</h1>
          <p className="mt-1 text-muted-foreground">
            Create postings through the API and manage your open positions.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!companyId}>
              <Plus className="mr-2 h-4 w-4" />
              New Posting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Job Posting</DialogTitle>
              <DialogDescription>
                This submits directly to the backend `/create-job-posting` endpoint.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="j-title">Job Title</Label>
                <Input
                  id="j-title"
                  placeholder="e.g., Full-Stack Engineer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="j-location">Location</Label>
                  <Input
                    id="j-location"
                    placeholder="e.g., Remote"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="j-salary">Salary Range</Label>
                  <Input
                    id="j-salary"
                    placeholder="e.g., $140k - $180k"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-desc">Description</Label>
                <Textarea
                  id="j-desc"
                  placeholder="Role details and responsibilities"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-reqs">Required Skills (comma separated)</Label>
                <Input
                  id="j-reqs"
                  placeholder="e.g., React, TypeScript, Python"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Posting"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="space-y-4">
        {postings.map((posting) => (
          <Card key={posting.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{posting.title}</CardTitle>
                  <CardDescription>
                    {posting.location} &middot; {posting.salary} &middot; {posting.type}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    posting.status === "active"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }
                >
                  {posting.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {posting.description}
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {posting.requirements.map((req) => (
                  <Badge key={req} variant="secondary" className="text-xs">
                    {req}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {posting.applicantCount} matched applicants
                </span>
                <span className="text-xs">Job ID: {posting.id}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  )
}
