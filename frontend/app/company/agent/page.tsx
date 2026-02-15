"use client"

import { FormEvent, Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Bot, FileText, History, LayoutGrid, List, Plus, Send, Sparkles, Trash2, User, UserCheck } from "lucide-react"
import { getAuth, getApiUrl } from "@/lib/api"
import {
  AgentChatRecord,
  CompanyJob,
  getAgentChats,
  getAgentMessages,
  getCompanyJobs,
  getCompanyApplicants,
  getTopCandidates,
  saveAgentMessages,
  TopCandidate,
  clearAgentMessages,
  generateCustomReport,
  GenerateReportResponse,
} from "@/lib/company-api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  candidates?: TopCandidate[]
  report?: {
    report_id: string
    report_name: string
    custom_prompt: string
    total_scored: number
  }
}

const SUGGESTED_PROMPTS = [
  "Find candidates with React and TypeScript for our frontend team",
  "I'm looking for the Python and C++ applicants",
]

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey there! Tell me what kind of candidate you're looking for, and I'll help you find the best matches from your applicant pool. Feel free to resume any previous conversation from the history below.",
}

function formatChatTime(value: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function buildNewChatId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `chat-${Date.now()}`
}

function AgentPageContent() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [jobId, setJobId] = useState("")
  const [jobs, setJobs] = useState<CompanyJob[]>([])
  const [chatHistory, setChatHistory] = useState<AgentChatRecord[]>([])
  const [historyView, setHistoryView] = useState<"list" | "grid">("list")
  const [activeChatId, setActiveChatId] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [companyId, setCompanyId] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [resumeModalUser, setResumeModalUser] = useState<{ userId: string; name: string } | null>(null)
  const [reportProgress, setReportProgress] = useState(0)

  // Report naming dialog state
  const [reportNameDialogOpen, setReportNameDialogOpen] = useState(false)
  const [pendingReportPrompt, setPendingReportPrompt] = useState("")
  const [reportName, setReportName] = useState("")
  const [reportNameError, setReportNameError] = useState("")


  const refreshHistory = async (cid: string) => {
    const res = await getAgentChats(cid)
    setChatHistory(res.chats)
  }

  const loadChat = async (cid: string, targetChatId: string) => {
    const msgsRes = await getAgentMessages(cid, targetChatId)
    const mapped = msgsRes.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      candidates: m.candidates && m.candidates.length > 0 ? m.candidates : undefined,
      report: m.report_metadata ? JSON.parse(m.report_metadata) : undefined,
    }))
    setActiveChatId(targetChatId)
    setMessages(mapped.length > 0 ? mapped : [WELCOME_MESSAGE])
  }

  const startNewChat = () => {
    const newChatId = buildNewChatId()
    setActiveChatId(newChatId)
    setMessages([WELCOME_MESSAGE])
    setError("")
  }

  const handleJobChange = (nextJobId: string) => {
    if (nextJobId !== jobId) {
      setJobId(nextJobId)
      startNewChat()
      return
    }
    setJobId(nextJobId)
  }

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to use Iris.")
      return
    }
    setCompanyId(auth.id)

    const init = async () => {
      try {
        const [jobsRes, chatsRes] = await Promise.all([getCompanyJobs(auth.id), getAgentChats(auth.id)])
        setJobs(jobsRes.jobs)
        if (jobsRes.jobs.length > 0) setJobId(jobsRes.jobs[0].id)
        setChatHistory(chatsRes.chats)

        const shouldStartNew = searchParams.get("new") === "1"
        if (shouldStartNew || chatsRes.chats.length === 0) {
          startNewChat()
          return
        }

        const latestChatId = chatsRes.chats[0].chat_id
        await loadChat(auth.id, latestChatId)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data")
      }
    }
    init()
  }, [searchParams])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const persistMessages = async (msgs: Message[]) => {
    if (!companyId || !activeChatId) return
    const toSave = msgs
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        message_id: m.id,
        role: m.role,
        content: m.content,
        candidates: JSON.stringify(m.candidates ?? []),
        report_metadata: m.report ? JSON.stringify(m.report) : "",
      }))
    if (toSave.length === 0) return

    await saveAgentMessages(companyId, activeChatId, toSave)
    await refreshHistory(companyId)
  }

  const clearCurrentChat = async () => {
    if (!companyId || !activeChatId) return
    setMessages([WELCOME_MESSAGE])
    await clearAgentMessages(companyId, activeChatId)
    await refreshHistory(companyId)
  }

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault()
    const prompt = input.trim()
    if (!prompt || !jobId.trim() || !activeChatId) return
    setError("")

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: prompt,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)
    setReportProgress(0)

    const newMessages: Message[] = [userMessage]

    try {
      // Check if there's a recent report in the conversation for follow-up questions
      const recentReport = [...messages].reverse().find((m) => m.report)?.report

      // Detect if this is a follow-up question about a report
      const isFollowUpQuestion =
        recentReport &&
        (prompt.toLowerCase().includes("candidate") ||
          prompt.toLowerCase().includes("applicant") ||
          prompt.toLowerCase().includes("compare") ||
          prompt.toLowerCase().includes("tell me more") ||
          prompt.toLowerCase().includes("top") ||
          prompt.toLowerCase().includes("about"))

      if (isFollowUpQuestion && recentReport) {
        // This is a follow-up question about the report
        const assistantMessage: Message = {
          id: String(Date.now() + 1),
          role: "assistant",
          content: `I'd love to help with that! To dive into the details and answer questions about specific candidates, head over to the Candidates tab using the button above. There you can see full profiles, detailed reasoning, and compare candidates side-by-side.`,
        }
        newMessages.push(assistantMessage)
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        // Ask for report name before generating
        const jobTitle = jobs.find((j) => j.id === jobId)?.title ?? "this job"
        const defaultName = `${jobTitle} - ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`

        setPendingReportPrompt(prompt)
        setReportName(defaultName)
        setReportNameDialogOpen(true)
        setIsTyping(false)
        return
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate report"
      setError(msg)
      const errorMessage: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: `Oops, something went wrong: ${msg}. Mind trying that again?`,
      }
      newMessages.push(errorMessage)
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      try {
        await persistMessages(newMessages)
      } catch {
        // best effort persistence
      }
    }
  }

  const confirmReportGeneration = async () => {
    if (!reportName.trim()) {
      setReportNameError("Report name is required")
      return
    }

    setReportNameDialogOpen(false)
    setReportNameError("")
    setIsTyping(true)
    setReportProgress(0)

    const prompt = pendingReportPrompt
    const newMessages: Message[] = []

    // Fetch applicant count and start progress animation
    // Backend processes in parallel batches of 5, up to 20 threads at once.
    // Each OpenAI call takes ~15-25s, so total time ≈ ceil(candidates/5) / 20 * ~20s
    let estimatedTime = 30000 // Default fallback
    let progressInterval: ReturnType<typeof setInterval> | null = null
    try {
      const applicantsRes = await getCompanyApplicants(companyId, jobId.trim())
      const candidateCount = Math.min(applicantsRes.applicants.length, 100)
      const numBatches = Math.ceil(candidateCount / 5)
      const parallelRounds = Math.ceil(numBatches / 20)
      estimatedTime = Math.max(25000, parallelRounds * 20000)
    } catch {
      // Use default
    }

    const startTime = Date.now()
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const percentComplete = Math.min(elapsed / estimatedTime, 0.9)
      setReportProgress(Math.round(percentComplete * 100))
    }, 50)

    try {
      const response = await generateCustomReport({
        company_id: companyId,
        job_id: jobId.trim(),
        report_name: reportName.trim(),
        custom_prompt: prompt,
      })

      // Map API response candidates to TopCandidate format for display
      const candidateCards: TopCandidate[] = response.top_candidates.map((c) => ({
        user_id: c.user_id,
        name: c.user_name || "Unknown",
        skills: c.skills ?? [],
        score: c.custom_fit_score,
        reasoning: c.custom_fit_reasoning,
      }))

      const topNames = candidateCards
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")

      // Create natural response based on number of candidates
      let responseText = ""
      if (response.total_scored === 0) {
        responseText = `I couldn't find any candidates for this role. Try adjusting your criteria or check if there are applicants in the system.`
      } else if (response.total_scored === 1) {
        responseText = `Found 1 candidate who matches your criteria.`
      } else if (topNames && response.total_scored <= 3) {
        responseText = `I found ${response.total_scored} candidates who fit what you're looking for.`
      } else if (topNames) {
        responseText = `Great! I ranked ${response.total_scored} candidates based on your criteria. Your top matches are ${topNames}.`
      } else {
        responseText = `I've ranked ${response.total_scored} candidates for you.`
      }

      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: responseText,
        report: {
          report_id: response.report_id,
          report_name: response.report_name,
          custom_prompt: response.custom_prompt,
          total_scored: response.total_scored,
        },
      }
      newMessages.push(assistantMessage)
      setMessages((prev) => [...prev, assistantMessage])
      setInfo(`✓ Generated report with ${response.total_scored} candidate${response.total_scored === 1 ? '' : 's'} scored.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate report"
      setError(msg)
      const errorMessage: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: `Oops, something went wrong: ${msg}. Mind trying that again?`,
      }
      newMessages.push(errorMessage)
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      setReportProgress(100)
      setIsTyping(false)
      setTimeout(() => setReportProgress(0), 1000)
      try {
        await persistMessages(newMessages)
      } catch {
        // best effort persistence
      }
    }
  }


  return (
    <DashboardShell role="company">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Sparkles className="h-6 w-6 text-primary" />
            Iris
          </h1>
          <p className="mt-1 text-muted-foreground">
            Chat with Iris to find, analyze, and rank the best candidates for your roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startNewChat} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New chat
          </Button>
          {messages.length > 1 && (
            <Button variant="ghost" size="sm" onClick={clearCurrentChat} className="gap-1.5 text-muted-foreground">
              <Trash2 className="h-4 w-4" />
              Clear chat
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <label className="mb-2 block text-sm font-medium text-foreground">Job Posting</label>
          <Select value={jobId} onValueChange={handleJobChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a job posting" />
            </SelectTrigger>
            <SelectContent>
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

      {isTyping && (
        <div className="mb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${reportProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col rounded-xl border border-border bg-card" style={{ height: "calc(100vh - 420px)" }}>
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

                  {message.report && (
                    <Card className="mt-3 border-2 border-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-5 w-5 text-primary" />
                          Report Generated
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{message.report.report_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {message.report.total_scored} candidates scored
                          </p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <p className="text-xs font-medium text-foreground/80">Custom Criteria:</p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {message.report.custom_prompt}
                          </p>
                        </div>
                        <Button
                          className="w-full gap-2"
                          onClick={() => {
                            window.location.href = `/company/candidates?report=${message.report!.report_id}`
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          View Report in Candidates Tab
                        </Button>
                      </CardContent>
                    </Card>
                  )}

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
                    Analyzing candidates...
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
            <Button type="submit" disabled={!input.trim() || !jobId.trim() || isTyping || !activeChatId}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Chat History
            </CardTitle>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Button
                type="button"
                size="sm"
                variant={historyView === "list" ? "default" : "ghost"}
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setHistoryView("list")}
              >
                <List className="h-3.5 w-3.5" />
                List
              </Button>
              <Button
                type="button"
                size="sm"
                variant={historyView === "grid" ? "default" : "ghost"}
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setHistoryView("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chatHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous chats yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-1">
              <div className={cn(historyView === "grid" ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "space-y-2")}>
                {chatHistory.map((chat) => (
                  <button
                    key={chat.chat_id}
                    type="button"
                    onClick={() => loadChat(companyId, chat.chat_id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                      activeChatId === chat.chat_id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {chat.last_message || "Conversation"}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatChatTime(chat.updated_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{chat.message_count} messages</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reportNameDialogOpen} onOpenChange={(open) => { if (!open) { setReportNameDialogOpen(false); setReportNameError("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name your report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={reportName}
              onChange={(e) => { setReportName(e.target.value); setReportNameError("") }}
              placeholder="Report name"
            />
            {reportNameError && <p className="text-sm text-destructive">{reportNameError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setReportNameDialogOpen(false); setReportNameError("") }}>
                Cancel
              </Button>
              <Button onClick={confirmReportGeneration}>
                Generate Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell role="company">
          <p className="text-sm text-muted-foreground">Loading Iris...</p>
        </DashboardShell>
      }
    >
      <AgentPageContent />
    </Suspense>
  )
}
