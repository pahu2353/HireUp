"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Bot, Search, Send, Sparkles, User, UserCheck, Zap } from "lucide-react"
import { getAuth } from "@/lib/api"
import { getTopCandidates, TopCandidate } from "@/lib/company-api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  candidates?: TopCandidate[]
}

const SUGGESTED_PROMPTS = [
  "react typescript frontend",
  "backend api distributed systems",
  "pytorch ranking recommender",
  "startup generalist full stack",
]

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask for candidate rankings and I will call /get-top-candidates with your prompt.",
    },
  ])
  const [input, setInput] = useState("")
  const [jobId, setJobId] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

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
    
    // Fetch jobs from backend
    const fetchJobs = async () => {
      try {
        const response = await fetch(`http://localhost:8000/get-company-jobs?company_id=${auth.id}`)
        const data = await response.json()
        if (data.jobs && data.jobs.length > 0) {
          setJobId(data.jobs[0].id)
        }
      } catch (e) {
        console.error("Failed to fetch jobs:", e)
      }
    }
    
    fetchJobs()
  }, [])

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
      const response = await getTopCandidates(jobId.trim(), prompt)
      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: `Found ${response.top_candidates.length} candidates for job ${response.job_id}.`,
        candidates: response.top_candidates,
      }
      setMessages((prev) => [...prev, assistantMessage])
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
        <Button
          variant={agentMode ? "default" : "outline"}
          onClick={() => setAgentMode((v) => !v)}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {agentMode ? "Agent Mode Active" : "Enable Agent Mode"}
        </Button>
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
          <label className="mb-2 block text-sm font-medium text-foreground">Job ID</label>
          <Input
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Paste a job id from the postings page"
          />
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

                  {message.candidates && (
                    <div className="space-y-2">
                      {message.candidates.map((candidate) => (
                        <div key={candidate.user_id} className="rounded-lg border border-border bg-background p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                <UserCheck className="h-3.5 w-3.5 text-foreground" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">{candidate.user_id}</span>
                            </div>
                            <div className="rounded-full bg-primary/10 px-2 py-0.5">
                              <span className="text-xs font-semibold text-primary">score {candidate.score}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {candidate.reasoning}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {candidate.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="px-2 py-0 text-xs">
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
    </DashboardShell>
  )
}
