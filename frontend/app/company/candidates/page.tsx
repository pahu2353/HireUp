"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Send, UserCheck } from "lucide-react"
import { getAuth } from "@/lib/api"
import { getCompanyPostings } from "@/lib/company-jobs"
import { getTopCandidates, submitIntervieweeList, TopCandidate } from "@/lib/company-api"

export default function CandidatesPage() {
  const [selected, setSelected] = useState<string[]>([])
  const [candidates, setCandidates] = useState<TopCandidate[]>([])
  const [companyId, setCompanyId] = useState("")
  const [jobId, setJobId] = useState("")
  const [prompt, setPrompt] = useState("python react typescript")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to view candidates.")
      return
    }
    setCompanyId(auth.id)
    const postings = getCompanyPostings(auth.id)
    if (postings.length > 0) {
      setJobId(postings[0].id)
    }
  }, [])

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const loadCandidates = async () => {
    if (!jobId.trim() || !prompt.trim()) return
    setError("")
    setInfo("")
    setIsLoading(true)
    setSelected([])
    try {
      const res = await getTopCandidates(jobId.trim(), prompt.trim())
      setCandidates(res.top_candidates)
      setInfo(`Loaded ${res.top_candidates.length} candidates for job ${res.job_id}.`)
    } catch (e) {
      setCandidates([])
      setError(e instanceof Error ? e.message : "Failed to load top candidates")
    } finally {
      setIsLoading(false)
    }
  }

  const submitList = async () => {
    if (!jobId || selected.length === 0) return
    setError("")
    setInfo("")
    setIsSubmitting(true)
    try {
      const res = await submitIntervieweeList(jobId, selected)
      setInfo(`Submitted ${res.user_ids.length} interviewees for job ${res.job_id}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit interview list")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardShell role="company">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Top Candidates</h1>
          <p className="mt-1 text-muted-foreground">
            Query ranked candidates and submit interviewee lists through the company API.
          </p>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selected.length} selected</span>
            <Button size="sm" onClick={submitList} disabled={isSubmitting}>
              <Send className="mr-1 h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Interview List"}
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="job-id">Job ID</Label>
              <Input
                id="job-id"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Paste job id from postings page"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="prompt">Candidate Prompt</Label>
              <Input
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. strong backend + distributed systems"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={loadCandidates} disabled={isLoading || !companyId}>
              {isLoading ? "Loading..." : "Get Top Candidates"}
            </Button>
            {!companyId ? <span className="text-xs text-muted-foreground">No company session</span> : null}
          </div>
        </CardContent>
      </Card>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}

      <div className="space-y-3">
        {candidates.map((candidate) => (
          <Card key={candidate.user_id} className={selected.includes(candidate.user_id) ? "border-primary/30" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selected.includes(candidate.user_id)}
                  onCheckedChange={() => toggleSelect(candidate.user_id)}
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <UserCheck className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{candidate.user_id}</CardTitle>
                    <div className="rounded-full bg-primary/10 px-2.5 py-0.5">
                      <span className="text-xs font-semibold text-primary">score {candidate.score}</span>
                    </div>
                  </div>
                  <CardDescription className="mt-0.5">{candidate.reasoning}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-[4.5rem]">
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  )
}
