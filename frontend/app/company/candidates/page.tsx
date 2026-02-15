"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText } from "lucide-react"
import { getAuth, getApiUrl } from "@/lib/api"
import {
  CompanyJob,
  CompanyApplicant,
  getCompanyApplicants,
  getCompanyJobs,
  updateApplicationStatus,
} from "@/lib/company-api"

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  rejected_pre_interview: "Candidate no longer under consideration (pre-interview)",
  in_progress: "In progress (interview)",
  rejected_post_interview: "Candidate no longer under consideration (post-interview)",
  offer: "Offer",
}

export default function CandidatesPage() {
  const [companyId, setCompanyId] = useState("")
  const [jobId, setJobId] = useState("")
  const [jobs, setJobs] = useState<CompanyJob[]>([])
  const [applicants, setApplicants] = useState<CompanyApplicant[]>([])
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const [resumeModalUser, setResumeModalUser] = useState<{ userId: string; name: string } | null>(null)

  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [pendingApplicationId, setPendingApplicationId] = useState("")
  const [pendingStatus, setPendingStatus] = useState<"rejected_post_interview" | "offer" | "">("")
  const [technicalScore, setTechnicalScore] = useState("")

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to view applicants.")
      return
    }
    setCompanyId(auth.id)
    getCompanyJobs(auth.id)
      .then((res) => {
        setJobs(res.jobs)
        if (res.jobs.length > 0) setJobId(res.jobs[0].id)
      })
      .catch(() => {})
  }, [])

  const loadApplicants = async () => {
    if (!companyId) return
    setError("")
    setInfo("")
    setIsLoading(true)
    try {
      const res = await getCompanyApplicants(companyId, jobId.trim() || undefined)
      setApplicants(res.applicants)
      const jobTitle = jobId ? jobs.find((j) => j.id === jobId)?.title ?? "selected job" : null
      setInfo(
        jobTitle === null
          ? `Loaded ${res.applicants.length} applicants across all postings.`
          : `Loaded ${res.applicants.length} applicants for ${jobTitle}.`
      )
    } catch (e) {
      setApplicants([])
      setError(e instanceof Error ? e.message : "Failed to load applicants")
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (
    applicationId: string,
    status: "rejected_pre_interview" | "in_progress" | "rejected_post_interview" | "offer",
    score?: number,
  ) => {
    if (!companyId) return
    setError("")
    setInfo("")
    setIsUpdating(applicationId)
    try {
      const res = await updateApplicationStatus({
        company_id: companyId,
        application_id: applicationId,
        status,
        technical_score: score,
      })
      setApplicants((prev) =>
        prev.map((a) =>
          a.application_id === applicationId
            ? {
                ...a,
                status: res.application.status,
                technical_score: res.application.technical_score,
              }
            : a,
        ),
      )
      setInfo(`Application moved to: ${STATUS_LABEL[status]}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setIsUpdating(null)
    }
  }

  const openScoreModal = (applicationId: string, status: "rejected_post_interview" | "offer") => {
    setPendingApplicationId(applicationId)
    setPendingStatus(status)
    setTechnicalScore("")
    setScoreModalOpen(true)
  }

  const submitScoreModal = async () => {
    const score = Number(technicalScore)
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      setError("Technical score must be an integer from 1 to 10.")
      return
    }
    if (!pendingApplicationId || !pendingStatus) return
    setScoreModalOpen(false)
    await updateStatus(pendingApplicationId, pendingStatus, score)
    setPendingApplicationId("")
    setPendingStatus("")
    setTechnicalScore("")
  }

  return (
    <DashboardShell role="company">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Interview Workflow</h1>
        <p className="mt-1 text-muted-foreground">Manage candidate status transitions with required scoring.</p>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="job-select">Job posting</Label>
              <Select
                value={jobId || "__all__"}
                onValueChange={(value) => setJobId(value === "__all__" ? "" : value)}
              >
                <SelectTrigger id="job-select">
                  <SelectValue placeholder="Select a job posting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All postings</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadApplicants} disabled={isLoading || !companyId} className="w-full">
                {isLoading ? "Loading..." : "Load Applicants"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}

      <div className="space-y-3">
        {applicants.map((candidate) => {
          const canMoveFromSubmitted = candidate.status === "submitted"
          const canMoveFromInProgress = candidate.status === "in_progress"
          return (
            <Card key={candidate.application_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{candidate.user_name || "Unknown"}</CardTitle>
                    <CardDescription>
                      {candidate.user_email} • {candidate.job_title}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{STATUS_LABEL[candidate.status] || candidate.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      setResumeModalUser({
                        userId: candidate.user_id,
                        name: candidate.user_name || "Unknown",
                      })
                    }
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Resume
                  </Button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {candidate.skills.map((skill, idx) => (
                    <Badge key={`${skill}-${idx}`} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mb-3 text-xs text-muted-foreground">
                  Technical score: {candidate.technical_score ?? "-"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canMoveFromSubmitted ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating === candidate.application_id}
                        onClick={() => updateStatus(candidate.application_id, "rejected_pre_interview")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isUpdating === candidate.application_id}
                        onClick={() => updateStatus(candidate.application_id, "in_progress")}
                      >
                        Move to In Progress
                      </Button>
                    </>
                  ) : null}
                  {canMoveFromInProgress ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating === candidate.application_id}
                        onClick={() => openScoreModal(candidate.application_id, "rejected_post_interview")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isUpdating === candidate.application_id}
                        onClick={() => openScoreModal(candidate.application_id, "offer")}
                      >
                        Offer
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Resume PDF Modal */}
      <Dialog open={!!resumeModalUser} onOpenChange={(open) => !open && setResumeModalUser(null)}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{resumeModalUser?.name}&apos;s Resume</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {resumeModalUser && (
              <iframe
                src={getApiUrl(`/resume/${resumeModalUser.userId}`)}
                className="h-full w-full rounded-lg border"
                title="Resume PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={scoreModalOpen}
        onOpenChange={(next) => {
          if (!next && pendingApplicationId && pendingStatus) {
            setError("You must submit the technical score before closing this dialog.")
          }
          setScoreModalOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Technical Skills Score Required</DialogTitle>
            <DialogDescription>
              Rank this candidate's technical skills from 1 to 10 before moving to{" "}
              {pendingStatus ? STATUS_LABEL[pendingStatus] : "the next stage"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="tech-score">Technical score (1-10)</Label>
            <Input
              id="tech-score"
              type="number"
              min={1}
              max={10}
              value={technicalScore}
              onChange={(e) => setTechnicalScore(e.target.value)}
            />
            <Button onClick={submitScoreModal} className="w-full">
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
