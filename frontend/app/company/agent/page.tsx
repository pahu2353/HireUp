"use client"

import { useState, useRef, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Search,
  UserCheck,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  candidates?: CandidateResult[]
  timestamp: Date
}

interface CandidateResult {
  name: string
  matchScore: number
  skills: string[]
  summary: string
}

const SUGGESTED_PROMPTS = [
  "Find candidates with strong React and TypeScript experience",
  "Who are the top 5 candidates for our backend role?",
  "Show me candidates with ML and infrastructure skills",
  "Which applicants have startup experience?",
]

const MOCK_RESPONSES: Record<string, { text: string; candidates?: CandidateResult[] }> = {
  default: {
    text: "I've analyzed your applicant pool against your requirements. Here's what I found:",
    candidates: [
      {
        name: "Sarah Kim",
        matchScore: 96,
        skills: ["React", "TypeScript", "Python"],
        summary:
          "Strong full-stack engineer with Waterloo co-op experience at Shopify. Excellent match for your tech stack.",
      },
      {
        name: "Michael Rodriguez",
        matchScore: 93,
        skills: ["React", "TypeScript", "Go"],
        summary:
          "Led microservices migration at a YC startup. Great system design skills and proven delivery track record.",
      },
      {
        name: "Emily Zhang",
        matchScore: 91,
        skills: ["Python", "AWS", "TypeScript"],
        summary:
          "ML platform engineer with strong infra skills. Unique blend of ML and traditional SWE that could be valuable.",
      },
    ],
  },
  backend: {
    text: "Here are the top candidates specifically for your backend engineering needs. I've weighted system design, API experience, and scalability skills:",
    candidates: [
      {
        name: "James Chen",
        matchScore: 94,
        skills: ["Go", "Rust", "PostgreSQL"],
        summary:
          "Systems-focused engineer who built high-throughput data pipelines. Excellent fit for backend performance work.",
      },
      {
        name: "Michael Rodriguez",
        matchScore: 91,
        skills: ["Go", "Docker", "GraphQL"],
        summary:
          "Led backend microservices at a YC startup. Strong API design and distributed systems experience.",
      },
    ],
  },
  startup: {
    text: "I found several candidates with direct startup experience. These applicants have demonstrated they can operate in fast-paced, ambiguous environments:",
    candidates: [
      {
        name: "Michael Rodriguez",
        matchScore: 95,
        skills: ["React", "Go", "Docker"],
        summary:
          "2 years at a YC startup, wore many hats. Led migrations, shipped features, and mentored interns.",
      },
      {
        name: "David Park",
        matchScore: 88,
        skills: ["TypeScript", "React", "Node.js"],
        summary:
          "Built and shipped multiple production apps at early-stage companies. Strong product sense.",
      },
    ],
  },
}

function getResponse(input: string) {
  const lower = input.toLowerCase()
  if (lower.includes("backend") || lower.includes("go") || lower.includes("api")) {
    return MOCK_RESPONSES.backend
  }
  if (lower.includes("startup") || lower.includes("early-stage")) {
    return MOCK_RESPONSES.startup
  }
  return MOCK_RESPONSES.default
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your HireUp AI recruiting agent. I have access to all your matched and validated candidates. Ask me anything — I can search, rank, and analyze applicants based on your specific needs. You can also activate Agent Mode to continuously search for candidates matching specific criteria.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const response = getResponse(userMessage.content)
      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: response.text,
        candidates: response.candidates,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <DashboardShell role="company">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Recruiting Agent
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your intelligent assistant for analyzing and finding the best
            candidates.
          </p>
        </div>
        <Button
          variant={agentMode ? "default" : "outline"}
          onClick={() => setAgentMode(!agentMode)}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {agentMode ? "Agent Mode Active" : "Enable Agent Mode"}
        </Button>
      </div>

      {agentMode && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Agent Mode is active
              </p>
              <p className="text-xs text-muted-foreground">
                Continuously searching for candidates matching your last query.
                You{"'"}ll be notified of new matches.
              </p>
            </div>
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col rounded-xl border border-border bg-card" style={{ height: "calc(100vh - 280px)" }}>
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] space-y-3",
                    message.role === "user" ? "text-right" : "text-left"
                  )}
                >
                  <div
                    className={cn(
                      "inline-block rounded-xl px-4 py-3 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {message.content}
                  </div>

                  {message.candidates && (
                    <div className="space-y-2">
                      {message.candidates.map((candidate) => (
                        <div
                          key={candidate.name}
                          className="rounded-lg border border-border bg-background p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                <UserCheck className="h-3.5 w-3.5 text-foreground" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                {candidate.name}
                              </span>
                            </div>
                            <div className="rounded-full bg-primary/10 px-2 py-0.5">
                              <span className="text-xs font-semibold text-primary">
                                {candidate.matchScore}% fit
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            {candidate.summary}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {candidate.skills.map((skill) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="text-xs px-2 py-0"
                              >
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
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                  </div>
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
                onClick={() => {
                  setInput(prompt)
                }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about candidates, search by skills, or describe your ideal hire..."
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </DashboardShell>
  )
}
