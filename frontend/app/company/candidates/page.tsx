"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  analyzeCandidateSkills,
  CandidateSkillAnalysis,
  CompanyApplicant,
  CompanyJob,
  getCompanyApplicants,
  getCompanyJobs,
  scoreApplicants,
  updateApplicationStatus,
  getCustomReports,
  CustomReport,
  getReportScores,
} from "@/lib/company-api"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  rejected_pre_interview: "Candidate no longer under consideration (pre-interview)",
  in_progress: "In progress (interview)",
  rejected_post_interview: "Candidate no longer under consideration (post-interview)",
  offer: "Offer",
}

function CandidatesPage() {
  const searchParams = useSearchParams()
  const [companyId, setCompanyId] = useState("")
  const [jobId, setJobId] = useState("")
  const [jobs, setJobs] = useState<CompanyJob[]>([])
  const [applicants, setApplicants] = useState<CompanyApplicant[]>([])
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [scoringProgress, setScoringProgress] = useState(0)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"fit_desc" | "date_desc" | "date_asc" | "status">("date_desc")
  const [selectedReportId, setSelectedReportId] = useState("")
  const [customReports, setCustomReports] = useState<CustomReport[]>([])
  const [reportScoresMap, setReportScoresMap] = useState<Record<string, Record<string, number>>>({})
  const [unscoredCount, setUnscoredCount] = useState(0)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("")

  const [analysisByCandidate, setAnalysisByCandidate] = useState<Record<string, CandidateSkillAnalysis>>({})
  const [analysisLoadingFor, setAnalysisLoadingFor] = useState<string | null>(null)
  const [analysisErrorFor, setAnalysisErrorFor] = useState<Record<string, string>>({})
  const [detailsModalCandidate, setDetailsModalCandidate] = useState<CompanyApplicant | null>(null)

  const [resumeModalUser, setResumeModalUser] = useState<{ userId: string; name: string } | null>(null)

  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [pendingApplicationId, setPendingApplicationId] = useState("")
  const [pendingStatus, setPendingStatus] = useState<"rejected_post_interview" | "offer" | "">("")
  const [technicalScore, setTechnicalScore] = useState("")
  const [scoreModalError, setScoreModalError] = useState("")

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to view applicants.")
      return
    }
    setCompanyId(auth.id)
    
    const init = async () => {
      try {
        const res = await getCompanyJobs(auth.id)
        setJobs(res.jobs)

        // Load custom reports
        const reportsRes = await getCustomReports(auth.id)
        setCustomReports(reportsRes.reports)

        // Check if URL has report parameter
        const reportParam = searchParams?.get("report")
        if (reportParam) {
          setSelectedReportId(reportParam)
        }

        // Auto-load all applicants (newest first by default)
        const countsRes = await getCompanyApplicants(auth.id)
        setApplicants(countsRes.applicants)
        setUnscoredCount(countsRes.applicants.filter((a) => a.fit_score === null).length)
        setInfo(`Loaded ${countsRes.applicants.length} applicants across all postings.`)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data")
      }
    }
    init()
  }, [])

  // Load report scores when a custom report is selected
  useEffect(() => {
    if (selectedReportId) {
      const loadReportScores = async () => {
        try {
          const res = await getReportScores(selectedReportId)
          const scoreMap: Record<string, number> = {}
          res.scores.forEach((s) => {
            scoreMap[s.application_id] = s.custom_fit_score
          })
          setReportScoresMap((prev) => ({ ...prev, [selectedReportId]: scoreMap }))
        } catch (e) {
          console.error("Failed to load report scores:", e)
        }
      }
      loadReportScores()
    }
  }, [selectedReportId])

  const loadApplicants = async () => {
    if (!companyId) return
    setError("")
    setInfo("")
    setIsLoading(true)
    try {
      const res = await getCompanyApplicants(companyId, jobId.trim() || undefined)
      setApplicants(res.applicants)
      const unscored = res.applicants.filter((a) => a.fit_score === null).length
      setUnscoredCount(unscored)

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

  const loadCandidateAnalysis = async (candidate: CompanyApplicant) => {
    if (!companyId) return
    setAnalysisLoadingFor(candidate.application_id)
    setAnalysisErrorFor((prev) => {
      const { [candidate.application_id]: _, ...rest } = prev
      return rest
    })
    try {
      const analysisJobId = jobId || candidate.job_id
      const res = await analyzeCandidateSkills({
        company_id: companyId,
        user_id: candidate.user_id,
        job_id: analysisJobId || undefined,
      })
      setAnalysisByCandidate((prev) => ({ ...prev, [candidate.application_id]: res.analysis }))
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to analyze candidate"
      setAnalysisErrorFor((prev) => ({ ...prev, [candidate.application_id]: errorMsg }))
    } finally {
      setAnalysisLoadingFor(null)
    }
  }

  const openDetailsModal = (candidate: CompanyApplicant) => {
    setSelectedCandidateId(candidate.application_id)
    setDetailsModalCandidate(candidate)
    if (!analysisByCandidate[candidate.application_id]) {
      loadCandidateAnalysis(candidate)
    }
  }

  const scoreNewApplicants = async () => {
    if (!companyId) return
    setError("")
    setIsScoring(true)
    setScoringProgress(0)
    setInfo("")
    
    try {
      const BATCH_SIZE = 5
      // Parallel processing: backend processes up to 100 applicants (20 threads × 5 each) per request.
      // Estimate: 25 seconds per 60 applicants → ~417ms per applicant.
      let totalScored = 0
      let remaining = unscoredCount
      
      while (remaining > 0) {
        const currentProgress = unscoredCount > 0 
          ? Math.round(((unscoredCount - remaining) / unscoredCount) * 100)
          : 0
        
        // Calculate expected completion for this parallel batch
        // Backend processes min(remaining, 100) applicants in parallel
        const willProcess = Math.min(remaining, 100)
        const nextProgress = unscoredCount > 0
          ? Math.round(((unscoredCount - (remaining - willProcess)) / unscoredCount) * 100)
          : 100
        
        // Time estimate: 25s per 60 applicants → ~417ms per applicant
        const estimatedTime = willProcess * 417
        
        const startTime = Date.now()
        let progressInterval: ReturnType<typeof setInterval> | null = null
        try {
          progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const percentComplete = Math.min(elapsed / estimatedTime, 0.98)
            const interpolated = Math.round(currentProgress + (nextProgress - currentProgress) * percentComplete)
            setScoringProgress(interpolated)
          }, 30)

          const res = await scoreApplicants(companyId, jobId.trim() || undefined, BATCH_SIZE, 0)
          if (res.scored_count === 0) break

          totalScored += res.scored_count
          remaining = res.total_unrated

          const actualProgress = unscoredCount > 0
            ? Math.round(((unscoredCount - remaining) / unscoredCount) * 100)
            : 100
          setScoringProgress(actualProgress)
          setApplicants(res.applicants)
          setUnscoredCount(remaining)

          if (remaining === 0) break
        } finally {
          if (progressInterval) clearInterval(progressInterval)
        }
      }
      
      setInfo(
        totalScored > 0
          ? `✓ Scored ${totalScored} applicant${totalScored === 1 ? "" : "s"}.`
          : "All applicants are already scored."
      )
      setScoringProgress(100)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to score applicants")
    } finally {
      setIsScoring(false)
      // Reset progress after a brief delay
      setTimeout(() => setScoringProgress(0), 2000)
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
    setScoreModalError("")
    setScoreModalOpen(true)
  }

  const submitScoreModal = async () => {
    const score = Number(technicalScore)
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      setScoreModalError("Technical score must be an integer from 1 to 10.")
      return
    }
    if (!pendingApplicationId || !pendingStatus) return
    setScoreModalError("")
    setScoreModalOpen(false)
    await updateStatus(pendingApplicationId, pendingStatus, score)
    setPendingApplicationId("")
    setPendingStatus("")
    setTechnicalScore("")
  }

  const sortedApplicants = useMemo(() => {
    let copy = [...applicants]
    
    // If custom report is selected, filter to only those with report scores
    if (selectedReportId) {
      const scoreMap = reportScoresMap[selectedReportId]
      if (scoreMap) {
        copy = copy.filter((a) => scoreMap[a.application_id] !== undefined)
        // Auto-sort by score when a report is selected, unless user explicitly chose a different sort
        if (sortBy === "date_desc") {
          // Default to score sorting for reports
          copy.sort((a, b) => (scoreMap[b.application_id] ?? -1) - (scoreMap[a.application_id] ?? -1))
          return copy
        }
      }
    }
    
    if (sortBy === "fit_desc") {
      // Use custom report scores if available, otherwise use regular fit_score
      if (selectedReportId) {
        const scoreMap = reportScoresMap[selectedReportId]
        if (scoreMap) {
          copy.sort((a, b) => (scoreMap[b.application_id] ?? -1) - (scoreMap[a.application_id] ?? -1))
        } else {
          copy.sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
        }
      } else {
        copy.sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
      }
      return copy
    }
    if (sortBy === "date_desc") {
      copy.sort((a, b) => (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0))
      return copy
    }
    if (sortBy === "date_asc") {
      copy.sort((a, b) => (Date.parse(a.created_at || "") || 0) - (Date.parse(b.created_at || "") || 0))
      return copy
    }
    copy.sort((a, b) => (STATUS_LABEL[a.status] || a.status).localeCompare(STATUS_LABEL[b.status] || b.status))
    return copy
  }, [applicants, sortBy, selectedReportId, reportScoresMap])

  const previousReports = useMemo(
    () => customReports.map((r) => ({ id: r.id, name: r.report_name })),
    [customReports],
  )

  return (
    <DashboardShell role="company">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Interview Workflow</h1>
        <p className="mt-1 text-muted-foreground">Manage candidate status transitions with required scoring.</p>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
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

            <div className="space-y-2">
              <Label htmlFor="sort-select">Sort applicants</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger id="sort-select">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Application date (newest)</SelectItem>
                  <SelectItem value="fit_desc">Strongest fit (fit score)</SelectItem>
                  <SelectItem value="date_asc">Application date (oldest)</SelectItem>
                  <SelectItem value="status">Application status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="load-btn" className="invisible">Load</Label>
              <Button id="load-btn" onClick={loadApplicants} disabled={isLoading || !companyId} className="w-full">
                {isLoading ? "Loading..." : "Load Applicants"}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="report-select">Previous reports</Label>
              <Select value={selectedReportId || undefined} onValueChange={setSelectedReportId}>
                <SelectTrigger id="report-select">
                  <SelectValue placeholder="Select a custom report (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {previousReports.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      No custom reports yet
                    </SelectItem>
                  ) : (
                    previousReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {unscoredCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {unscoredCount} new applicant{unscoredCount === 1 ? "" : "s"} pending fit score
            </p>
            <p className="text-xs text-muted-foreground">
              New applicants have not been fit-scored yet.
            </p>
          </div>
          <Button
            onClick={scoreNewApplicants}
            disabled={isScoring || !companyId}
            variant="secondary"
          >
            {isScoring ? "Scoring..." : "Score Now"}
          </Button>
        </div>
      )}

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      
      {isScoring && (
        <div className="mb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${scoringProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {info && !isScoring ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}

      <div className="space-y-3">
        {sortedApplicants.map((candidate) => {
          const canMoveFromSubmitted = candidate.status === "submitted"
          const canMoveFromInProgress = candidate.status === "in_progress"
          return (
            <Card
              key={candidate.application_id}
              onClick={() => openDetailsModal(candidate)}
              className={
                selectedCandidateId === candidate.application_id
                  ? "cursor-pointer border-primary/50 hover:border-primary/60"
                  : "cursor-pointer hover:border-primary/30"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base">{candidate.user_name || "Unknown"}</CardTitle>
                    <CardDescription>
                      {candidate.user_email} • {candidate.job_title}
                    </CardDescription>
                    {(candidate.grad_date || candidate.linkedin_url || candidate.github_url) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {candidate.grad_date ? <span>Grad: {candidate.grad_date}</span> : null}
                        {candidate.linkedin_url ? (
                          <a
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            LinkedIn
                          </a>
                        ) : null}
                        {candidate.github_url ? (
                          <a
                            href={candidate.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            GitHub
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      // Show custom report score if selected, otherwise regular fit_score
                      const displayScore = selectedReportId
                        ? reportScoresMap[selectedReportId]?.[candidate.application_id]
                        : candidate.fit_score
                      
                      return displayScore !== null && displayScore !== undefined ? (
                        <div className="rounded-full bg-primary/10 px-3.5 py-1.5">
                          <span className="text-base font-bold text-primary">{displayScore}</span>
                        </div>
                      ) : null
                    })()}
                    <Badge variant="secondary">{STATUS_LABEL[candidate.status] || candidate.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      setResumeModalUser({
                        userId: candidate.user_id,
                        name: candidate.user_name || "Unknown",
                      })
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Resume
                  </Button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {candidate.skills.map((skill, idx) => (
                    <Badge key={`${skill}-${idx}`} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                {candidate.fit_score !== null && candidate.fit_reasoning && (
                  <div className="mb-3 text-xs text-muted-foreground leading-relaxed">
                    {candidate.fit_reasoning}
                  </div>
                )}
                {candidate.status === "in_progress" && candidate.technical_score !== null && (
                  <div className="mb-3 text-xs text-muted-foreground">
                    Technical interview score: {candidate.technical_score}/10
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {canMoveFromSubmitted ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating === candidate.application_id}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateStatus(candidate.application_id, "rejected_pre_interview")
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isUpdating === candidate.application_id}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateStatus(candidate.application_id, "in_progress")
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          openScoreModal(candidate.application_id, "rejected_post_interview")
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isUpdating === candidate.application_id}
                        onClick={(e) => {
                          e.stopPropagation()
                          openScoreModal(candidate.application_id, "offer")
                        }}
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

      <Dialog
        open={!!detailsModalCandidate}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsModalCandidate(null)
            setSelectedCandidateId("")
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{detailsModalCandidate?.user_name || "Candidate"} Skill Snapshot</DialogTitle>
            <DialogDescription>
              Skills scored against job requirements
            </DialogDescription>
          </DialogHeader>
          {detailsModalCandidate ? (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-sm text-foreground">
                  {detailsModalCandidate.user_name || "Candidate"} • {detailsModalCandidate.user_email}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {detailsModalCandidate.grad_date ? <span>Graduation date: {detailsModalCandidate.grad_date}</span> : null}
                  {detailsModalCandidate.linkedin_url ? (
                    <a
                      href={detailsModalCandidate.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  {detailsModalCandidate.github_url ? (
                    <a
                      href={detailsModalCandidate.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub
                    </a>
                  ) : null}
                </div>
              </div>
              {analysisLoadingFor === detailsModalCandidate.application_id ? (
                <p className="text-sm text-muted-foreground">Analyzing candidate skills...</p>
              ) : analysisErrorFor[detailsModalCandidate.application_id] ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">
                    {analysisErrorFor[detailsModalCandidate.application_id]}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={(analysisByCandidate[detailsModalCandidate.application_id]?.skills ?? [])
                            .slice(0, 6)
                            .map((s) => ({ skill: s.name, score: s.score }))}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis
                            domain={[0, 100]}
                            ticks={[20, 40, 60, 80, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.45}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(analysisByCandidate[detailsModalCandidate.application_id]?.skills ?? [])
                      .slice(0, 6)
                      .map((item) => (
                        <div
                          key={item.name}
                          className="rounded-2xl border border-border/70 bg-gradient-to-r from-primary/10 to-background p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            <span className="text-sm font-semibold text-primary">{item.score}/100</span>
                          </div>
                        </div>
                      ))}
                    <p className="pt-1 text-xs text-muted-foreground">
                      {analysisByCandidate[detailsModalCandidate.application_id]?.summary || "No summary available."}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

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
            setScoreModalError("You must submit the technical score before closing this dialog.")
            setScoreModalOpen(true)
            return
          }
          if (!next) {
            setScoreModalError("")
            setPendingApplicationId("")
            setPendingStatus("")
            setTechnicalScore("")
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
            {scoreModalError ? <p className="text-sm text-destructive">{scoreModalError}</p> : null}
            <Label htmlFor="tech-score">Technical score (1-10)</Label>
            <Input
              id="tech-score"
              type="number"
              min={1}
              max={10}
              value={technicalScore}
              onChange={(e) => {
                setTechnicalScore(e.target.value)
                if (scoreModalError) setScoreModalError("")
              }}
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

export default function CandidatesPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CandidatesPage />
    </Suspense>
  )
}
