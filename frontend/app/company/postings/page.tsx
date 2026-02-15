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
import { Plus, Trash2, Users } from "lucide-react"
import { getAuth } from "@/lib/api"
import {
  createCompanyJobPosting,
  deleteCompanyJobPosting,
  getCompanyApplicants,
  getCompanyJobs,
  updateCompanyJobPosting,
} from "@/lib/company-api"

interface CompanyPostingView {
  id: string
  title: string
  location: string
  salary: string
  type: string
  description: string
  requirements: string[]
  applicantCount: number
  status: string
}

export default function PostingsPage() {
  const [companyId, setCompanyId] = useState("")
  const [postings, setPostings] = useState<CompanyPostingView[]>([])
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newLocation, setNewLocation] = useState("Remote")
  const [newSalary, setNewSalary] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newRequirements, setNewRequirements] = useState("")
  const [error, setError] = useState("")
  const [createModalError, setCreateModalError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editModalError, setEditModalError] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeletePosting, setPendingDeletePosting] = useState<CompanyPostingView | null>(null)
  const [deleteModalError, setDeleteModalError] = useState("")
  const [selectedPostingId, setSelectedPostingId] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editLocation, setEditLocation] = useState("Remote")
  const [editSalary, setEditSalary] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editRequirements, setEditRequirements] = useState("")

  const parseSkills = (value: string) =>
    value
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
  const createSkillsCount = parseSkills(newRequirements).length
  const editSkillsCount = parseSkills(editRequirements).length
  const createCanSubmit = Boolean(newTitle.trim() && newDescription.trim() && createSkillsCount >= 3)
  const editCanSubmit = Boolean(editTitle.trim() && editDescription.trim() && editSkillsCount >= 3)

  const loadCompanyData = async (id: string) => {
    const [jobsRes, applicantsRes] = await Promise.all([
      getCompanyJobs(id),
      getCompanyApplicants(id),
    ])
    const applicantCounts = applicantsRes.applicants.reduce<Record<string, number>>((acc, app) => {
      acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
      return acc
    }, {})
    const mapped = jobsRes.jobs.map((job) => ({
      id: job.id,
      title: job.title,
      location: job.location || "Remote",
      salary: job.salary_range || "TBD",
      type: "Full-time",
      description: job.description || "",
      requirements: Array.isArray(job.skills) ? job.skills : [],
      applicantCount: applicantCounts[job.id] ?? 0,
      status: job.status || "open",
    })).filter((job) => job.status !== "closed")
    setPostings(mapped)
  }

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to create and manage postings.")
      return
    }
    setCompanyId(auth.id)
    loadCompanyData(auth.id).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to load postings")
    })
  }, [])

  const handleCreate = async () => {
    if (!companyId) return

    setCreateModalError("")
    const title = newTitle.trim()
    const description = newDescription.trim()
    const requirements = parseSkills(newRequirements)

    if (!title) {
      setCreateModalError("Job title is required.")
      return
    }
    if (!description) {
      setCreateModalError("Description is required.")
      return
    }
    if (requirements.length < 3) {
      setCreateModalError("Please add at least 3 required skills.")
      return
    }

    setIsCreating(true)
    try {
      await createCompanyJobPosting({
        company_id: companyId,
        title,
        description,
        skills: requirements,
        location: newLocation.trim() || "Remote",
        salary_range: newSalary.trim() || "TBD",
      })

      await loadCompanyData(companyId)

      setNewTitle("")
      setNewLocation("Remote")
      setNewSalary("")
      setNewDescription("")
      setNewRequirements("")
      setCreateModalError("")
      setOpen(false)
    } catch (e) {
      setCreateModalError(e instanceof Error ? e.message : "Failed to create posting")
    } finally {
      setIsCreating(false)
    }
  }

  const openEditModal = (posting: CompanyPostingView) => {
    setSelectedPostingId(posting.id)
    setEditTitle(posting.title || "")
    setEditLocation(posting.location || "Remote")
    setEditSalary(posting.salary || "")
    setEditDescription(posting.description || "")
    setEditRequirements((posting.requirements || []).join(", "))
    setEditModalError("")
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!companyId || !selectedPostingId) return

    setEditModalError("")
    const title = editTitle.trim()
    const description = editDescription.trim()
    const requirements = parseSkills(editRequirements)

    if (!title) {
      setEditModalError("Job title is required.")
      return
    }
    if (!description) {
      setEditModalError("Description is required.")
      return
    }
    if (requirements.length < 3) {
      setEditModalError("Please add at least 3 required skills.")
      return
    }

    setIsSavingEdit(true)
    try {
      await updateCompanyJobPosting({
        company_id: companyId,
        job_id: selectedPostingId,
        title,
        description,
        skills: requirements,
        location: editLocation.trim() || "Remote",
        salary_range: editSalary.trim() || "TBD",
      })
      await loadCompanyData(companyId)
      setEditModalError("")
      setEditOpen(false)
      setSelectedPostingId("")
    } catch (e) {
      setEditModalError(e instanceof Error ? e.message : "Failed to update posting")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const openDeleteConfirm = (posting: CompanyPostingView) => {
    setPendingDeletePosting(posting)
    setDeleteModalError("")
    setDeleteConfirmOpen(true)
  }

  const deletePostingById = async () => {
    if (!companyId || !pendingDeletePosting?.id) return
    setIsDeleting(true)
    try {
      await deleteCompanyJobPosting({
        company_id: companyId,
        job_id: pendingDeletePosting.id,
      })
      await loadCompanyData(companyId)
      if (selectedPostingId === pendingDeletePosting.id) {
        setEditOpen(false)
        setSelectedPostingId("")
      }
      setDeleteModalError("")
      setDeleteConfirmOpen(false)
      setPendingDeletePosting(null)
    } catch (e) {
      setDeleteModalError(e instanceof Error ? e.message : "Failed to delete posting")
    } finally {
      setIsDeleting(false)
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
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setCreateModalError("")
          }}
        >
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
              {createModalError ? <p className="text-sm text-destructive">{createModalError}</p> : null}
              <div className="space-y-2">
                <Label htmlFor="j-title">Job Title</Label>
                <Input
                  id="j-title"
                  placeholder="e.g., Full-Stack Engineer"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    if (createModalError) setCreateModalError("")
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="j-location">Location</Label>
                  <Input
                    id="j-location"
                    placeholder="e.g., Remote"
                    value={newLocation}
                    onChange={(e) => {
                      setNewLocation(e.target.value)
                      if (createModalError) setCreateModalError("")
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="j-salary">Salary Range</Label>
                  <Input
                    id="j-salary"
                    placeholder="e.g., $140k - $180k"
                    value={newSalary}
                    onChange={(e) => {
                      setNewSalary(e.target.value)
                      if (createModalError) setCreateModalError("")
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-desc">Description</Label>
                <Textarea
                  id="j-desc"
                  placeholder="Role details and responsibilities"
                  value={newDescription}
                  onChange={(e) => {
                    setNewDescription(e.target.value)
                    if (createModalError) setCreateModalError("")
                  }}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-reqs">Required Skills (comma separated)</Label>
                <Input
                  id="j-reqs"
                  placeholder="e.g., React, TypeScript, Python (minimum 3)"
                  value={newRequirements}
                  onChange={(e) => {
                    setNewRequirements(e.target.value)
                    if (createModalError) setCreateModalError("")
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {createSkillsCount}/3 minimum skills selected
                </p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isCreating || !createCanSubmit}>
                {isCreating ? "Creating..." : "Create Posting"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="space-y-4">
        {postings.map((posting) => (
          <Card
            key={posting.id}
            onClick={() => openEditModal(posting)}
            className="cursor-pointer transition-colors hover:border-primary/40"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{posting.title}</CardTitle>
                  <CardDescription>
                    {posting.location} &middot; {posting.salary} &middot; {posting.type}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      openDeleteConfirm(posting)
                    }}
                    disabled={isDeleting}
                    aria-label="Delete job posting"
                    title="Delete job posting"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Badge
                    variant="secondary"
                    className={
                      posting.status === "open" || posting.status === "active"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }
                  >
                    {posting.status}
                  </Badge>
                </div>
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
                <span className="text-xs">Click card to edit</span>
                <span className="text-xs">Job ID: {posting.id}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next)
          if (!next) {
            setEditModalError("")
            setSelectedPostingId("")
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>
              Update this posting and save changes to the backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editModalError ? <p className="text-sm text-destructive">{editModalError}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="e-title">Job Title</Label>
              <Input
                id="e-title"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value)
                  if (editModalError) setEditModalError("")
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-location">Location</Label>
                <Input
                  id="e-location"
                  value={editLocation}
                  onChange={(e) => {
                    setEditLocation(e.target.value)
                    if (editModalError) setEditModalError("")
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-salary">Salary Range</Label>
                <Input
                  id="e-salary"
                  value={editSalary}
                  onChange={(e) => {
                    setEditSalary(e.target.value)
                    if (editModalError) setEditModalError("")
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-desc">Description</Label>
              <Textarea
                id="e-desc"
                value={editDescription}
                onChange={(e) => {
                  setEditDescription(e.target.value)
                  if (editModalError) setEditModalError("")
                }}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-reqs">Required Skills (comma separated)</Label>
              <Input
                id="e-reqs"
                value={editRequirements}
                onChange={(e) => {
                  setEditRequirements(e.target.value)
                  if (editModalError) setEditModalError("")
                }}
              />
              <p className="text-xs text-muted-foreground">
                {editSkillsCount}/3 minimum skills selected
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || isDeleting || !editCanSubmit}
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(next) => {
          if (isDeleting) return
          setDeleteConfirmOpen(next)
          if (!next) {
            setDeleteModalError("")
            setPendingDeletePosting(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl border-border/70">
          <DialogHeader>
            <DialogTitle>Close Job Posting?</DialogTitle>
            <DialogDescription>
              Delete this job posting? This will close it for applicants.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pendingDeletePosting ? (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">{pendingDeletePosting.title}</p>
                <p className="text-muted-foreground">{pendingDeletePosting.location}</p>
              </div>
            ) : null}
            {deleteModalError ? <p className="text-sm text-destructive">{deleteModalError}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setPendingDeletePosting(null)
                  setDeleteModalError("")
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={deletePostingById}
                disabled={isDeleting}
              >
                {isDeleting ? "Closing..." : "Close Job"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
