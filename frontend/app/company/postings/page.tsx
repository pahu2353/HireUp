"use client"

import { useState } from "react"
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

interface JobPosting {
  id: string
  title: string
  location: string
  salary: string
  type: string
  description: string
  requirements: string[]
  applicantCount: number
  status: "active" | "paused" | "closed"
}

const INITIAL_POSTINGS: JobPosting[] = [
  {
    id: "1",
    title: "Full-Stack Engineer",
    location: "San Francisco, CA",
    salary: "$140k - $180k",
    type: "Full-time",
    description:
      "Build and scale our real-time data processing platform across the full stack.",
    requirements: ["React", "TypeScript", "Python", "PostgreSQL"],
    applicantCount: 47,
    status: "active",
  },
  {
    id: "2",
    title: "Backend Engineer",
    location: "Remote",
    salary: "$130k - $165k",
    type: "Full-time",
    description:
      "Design and implement high-performance APIs handling millions of requests daily.",
    requirements: ["Go", "PostgreSQL", "GraphQL", "Docker"],
    applicantCount: 32,
    status: "active",
  },
  {
    id: "3",
    title: "DevOps Engineer",
    location: "New York, NY",
    salary: "$150k - $190k",
    type: "Full-time",
    description:
      "Own our infrastructure and CI/CD pipelines. Scale systems to handle 10x growth.",
    requirements: ["Kubernetes", "AWS", "Terraform", "Docker"],
    applicantCount: 18,
    status: "active",
  },
]

export default function PostingsPage() {
  const [postings, setPostings] = useState<JobPosting[]>(INITIAL_POSTINGS)
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newLocation, setNewLocation] = useState("")
  const [newSalary, setNewSalary] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newRequirements, setNewRequirements] = useState("")

  const handleCreate = () => {
    if (!newTitle) return
    const newPosting: JobPosting = {
      id: String(postings.length + 1),
      title: newTitle,
      location: newLocation,
      salary: newSalary,
      type: "Full-time",
      description: newDescription,
      requirements: newRequirements.split(",").map((r) => r.trim()).filter(Boolean),
      applicantCount: 0,
      status: "active",
    }
    setPostings([newPosting, ...postings])
    setNewTitle("")
    setNewLocation("")
    setNewSalary("")
    setNewDescription("")
    setNewRequirements("")
    setOpen(false)
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
                <Label htmlFor="j-reqs">
                  Required Skills (comma separated)
                </Label>
                <Input
                  id="j-reqs"
                  placeholder="e.g., React, TypeScript, Python"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Create Posting
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {postings.map((posting) => (
          <Card key={posting.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{posting.title}</CardTitle>
                  <CardDescription>
                    {posting.location} &middot; {posting.salary} &middot;{" "}
                    {posting.type}
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
              <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                {posting.description}
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {posting.requirements.map((req) => (
                  <Badge key={req} variant="secondary" className="text-xs">
                    {req}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {posting.applicantCount} matched applicants
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
    </DashboardShell>
  )
}
