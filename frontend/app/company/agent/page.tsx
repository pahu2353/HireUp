"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Bot, FileText, Search, Send, Sparkles, Trash2, User, UserCheck, Zap } from "lucide-react"
import { getAuth, getApiUrl } from "@/lib/api"
import { CompanyJob, getCompanyJobs, getTopCandidates, TopCandidate } from "@/lib/company-api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  candidates?: TopCandidate[]
  rankingSource?: "openai" | "fallback" | "none" | "unknown"
}

const SUGGESTED_PROMPTS = [
  "Top 3 applicants with Python and C++",
  "Give me the top 5 candidates with machine learning experience",
  "Find candidates with React and TypeScript for our frontend team",
  "Best 7 applicants with distributed systems and API design",
]

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your AI recruiting assistant. Describe the ideal candidate you're looking for — skills, experience, or role type — and I'll rank your applicants to find the best matches. Select a job posting above to get started.",
}

const STORAGE_KEY = "hireup_agent_history"

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [jobId, setJobId] = useState("")
  const [jobs, setJobs] = useState<CompanyJob[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [resumeModalUser, setResumeModalUser] = useState<{ userId: string; name: string } | null>(null)

  // Restore from localStorage on mount (client-only, avoids hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Message[]
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch {
      // ignore corrupt data
    }
  }, [])

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // storage full or unavailable — silently ignore
    }
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to use the recruiting agent.")
      return
    }

    getCompanyJobs(auth.id)
      .then((res) => {
        setJobs(res.jobs)
        if (res.jobs.length > 0) {
          setJobId(res.jobs[0].id)
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load job postings")
      })
  }, [])

  const clearHistory = () => {
    setMessages([WELCOME_MESSAGE])
  }

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault()
    const prompt = input.trim()
    if (!prompt || !jobId.trim()) return
    setError("")

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: prompt,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    try {
      if (jobId === "__all__") {
        if (jobs.length === 0) {
          throw new Error("No job postings available.")
        }
        const results = await Promise.all(
          jobs.map(async (job) => {
            const response = await getTopCandidates(job.id, prompt)
            return { jobTitle: job.title, response }
          }),
        )
        const assistantMessages: Message[] = results.map(({ jobTitle, response }, idx) => {
          const topNames = response.top_candidates
            .slice(0, 3)
            .map((c) => c.name || "Unknown")
            .join(", ")
          const sourceLabel = response.ranking_source === "openai" ? "OpenAI" : "local fallback"
          const note =
            response.ranking_source === "fallback"
              ? " OpenAI was unavailable, so this used the local ranker."
              : ""
          return {
            id: String(Date.now() + 1 + idx),
            role: "assistant",
            content: `Ranked ${response.top_candidates.length} candidates for ${jobTitle} using ${sourceLabel}. Top picks: ${topNames || "None"}.${note}`,
            candidates: response.top_candidates,
            rankingSource: response.ranking_source ?? "unknown",
          }
        })
        setMessages((prev) => [...prev, ...assistantMessages])
      } else {
        const response = await getTopCandidates(jobId.trim(), prompt)
        const jobTitle = jobs.find((j) => j.id === jobId)?.title ?? "this job"
        const topNames = response.top_candidates
          .slice(0, 3)
          .map((c) => c.name || "Unknown")
          .join(", ")
        const sourceLabel = response.ranking_source === "openai" ? "OpenAI" : "local fallback"
        const note =
          response.ranking_source === "fallback"
            ? " OpenAI was unavailable, so this used the local ranker."
            : ""
        const assistantMessage: Message = {
          id: String(Date.now() + 1),
          role: "assistant",
          content: `Ranked ${response.top_candidates.length} candidates for ${jobTitle} using ${sourceLabel}. Top picks: ${topNames || "None"}.${note}`,
          candidates: response.top_candidates,
          rankingSource: response.ranking_source ?? "unknown",
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch candidates"
      setError(msg)
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: `Request failed: ${msg}`,
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <DashboardShell role="company">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Recruiting Agent
          </h1>
          <p className="mt-1 text-muted-foreground">
            Company-side chat tied to backend candidate ranking endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-1.5 text-muted-foreground">
              <Trash2 className="h-4 w-4" />
              Clear history
            </Button>
          )}
          <Button
            variant={agentMode ? "default" : "outline"}
            onClick={() => setAgentMode((v) => !v)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            {agentMode ? "Agent Mode Active" : "Enable Agent Mode"}
          </Button>
        </div>
      </div>

      {agentMode && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Agent Mode is active</p>
              <p className="text-xs text-muted-foreground">
                Searches continue against the currently selected job id.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="pt-6">
          <label className="mb-2 block text-sm font-medium text-foreground">Job Posting</label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger>
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
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col rounded-xl border border-border bg-card" style={{ height: "calc(100vh - 340px)" }}>
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={cn("max-w-[80%] space-y-3", message.role === "user" ? "text-right" : "text-left")}>
                  <div
                    className={cn(
                      "inline-block rounded-xl px-4 py-3 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                  {message.rankingSource ? (
                    <div className="text-[11px] text-muted-foreground">
                      Ranking source:{" "}
                      {message.rankingSource === "openai"
                        ? "OpenAI model"
                        : message.rankingSource === "fallback"
                          ? "Local fallback"
                          : "Unknown"}
                    </div>
                  ) : null}

                  {message.candidates && (
                    <div className="space-y-2">
                      {message.candidates.map((candidate) => (
                        <div key={candidate.user_id} className="rounded-lg border border-border bg-background p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                <UserCheck className="h-3.5 w-3.5 text-foreground" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                {candidate.name || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                onClick={() =>
                                  setResumeModalUser({
                                    userId: candidate.user_id,
                                    name: candidate.name || "Unknown",
                                  })
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Resume
                              </Button>
                              <div className="rounded-full bg-primary/10 px-2 py-0.5">
                                <span className="text-xs font-semibold text-primary">score {candidate.score}</span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {candidate.reasoning}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {candidate.skills.map((skill, idx) => (
                              <Badge key={`${skill}-${idx}`} variant="secondary" className="px-2 py-0 text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 animate-pulse">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Reading resumes and ranking candidates
                  </span>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the ideal candidate and required skills..."
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || !jobId.trim() || isTyping}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
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
    </DashboardShell>
  )
}
