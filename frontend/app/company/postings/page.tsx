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
import { Plus, Users, Eye } from "lucide-react"
import { getAuth, createJobPosting, getCompanyJobs } from "@/lib/api"
import { toast } from "sonner"

interface JobPosting {
  id: string
  title: string
  location: string
  salary_range: string
  description: string
  skills: string[]
  status: string
  created_at: string
}

export default function PostingsPage() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState("")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newLocation, setNewLocation] = useState("Remote")
  const [newSalary, setNewSalary] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newSkills, setNewSkills] = useState("")

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      window.location.href = "/login"
      return
    }
    setCompanyId(auth.id)
    getCompanyJobs(auth.id)
      .then(setPostings)
      .catch(() => toast.error("Failed to load job postings"))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newTitle) {
      toast.error("Job title is required")
      return
    }
    setCreating(true)
    try {
      const skills = newSkills.split(",").map((s) => s.trim()).filter(Boolean)
      const jobId = await createJobPosting({
        company_id: companyId,
        title: newTitle,
        description: newDescription,
        skills,
        location: newLocation,
        salary_range: newSalary,
      })
      toast.success("Job posting created successfully!")
      // Refresh the list
      const updatedJobs = await getCompanyJobs(companyId)
      setPostings(updatedJobs)
      setNewTitle("")
      setNewLocation("Remote")
      setNewSalary("")
      setNewDescription("")
      setNewSkills("")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job posting")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell role="company">
        <p className="text-muted-foreground">Loading job postings...</p>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="company">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Postings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your open positions.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Posting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Job Posting</DialogTitle>
              <DialogDescription>
                Fill in the details for your new job posting. Our two-tower model
                will start matching candidates immediately.
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
                  placeholder="Describe the role, responsibilities, and what makes it exciting..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-skills">
                  Required Skills (comma separated)
                </Label>
                <Input
                  id="j-skills"
                  placeholder="e.g., React, TypeScript, Python"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create Posting"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {postings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No job postings yet. Create your first posting to start matching with candidates!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {postings.map((posting) => (
            <Card key={posting.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{posting.title}</CardTitle>
                    <CardDescription>
                      {posting.location} &middot; {posting.salary_range}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      posting.status === "open"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }
                  >
                    {posting.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  {posting.description || "No description provided."}
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {posting.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      matched applicants
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View Candidates
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}

