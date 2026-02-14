"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { X } from "lucide-react"
import { signupUser, signupCompany } from "@/lib/api"

const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Python",
  "Go",
  "AWS",
  "Docker",
  "Kubernetes",
  "Machine Learning",
  "Node.js",
  "PostgreSQL",
  "GraphQL",
  "Rust",
]

export default function SignupPage() {
  const router = useRouter()
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [aFirstName, setAFirstName] = useState("")
  const [aLastName, setALastName] = useState("")
  const [aEmail, setAEmail] = useState("")
  const [aPassword, setAPassword] = useState("")
  const [aResume, setAResume] = useState("")
  const [aObjective, setAObjective] = useState("")
  const [cName, setCName] = useState("")
  const [cEmail, setCEmail] = useState("")
  const [cPassword, setCPassword] = useState("")
  const [cWebsite, setCWebsite] = useState("")
  const [cDescription, setCDescription] = useState("")
  const [cSize, setCSize] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
    }
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  return (
    <div className="relative flex min-h-screen">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="hidden w-1/2 flex-col justify-between bg-card p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
            <span className="text-sm font-bold text-primary-foreground">H</span>
          </div>
          <span className="text-lg font-bold text-foreground">HireUp</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-foreground">
            Your next opportunity
            <br />
            <span className="bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">is waiting.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
            Create your account and start getting matched with roles and
            candidates that actually fit.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Built by Waterloo students.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
                <span className="text-sm font-bold text-primary-foreground">
                  H
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">HireUp</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your role to get started.
          </p>

          <Tabs defaultValue="applicant" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="applicant" className="flex-1">
                Applicant
              </TabsTrigger>
              <TabsTrigger value="company" className="flex-1">
                Company
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applicant">
              <form
                className="mt-4 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setError("")
                  setLoading(true)
                  try {
                    await signupUser({
                      email: aEmail,
                      password: aPassword,
                      name: [aFirstName, aLastName].filter(Boolean).join(" ") || "Applicant",
                      resume: aResume,
                      interests: skills,
                    })
                    router.push("/login?registered=1")
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Signup failed")
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="Jane" value={aFirstName} onChange={(e) => setAFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Doe" value={aLastName} onChange={(e) => setALastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="a-email">Email</Label>
                  <Input
                    id="a-email"
                    type="email"
                    placeholder="you@example.com"
                    value={aEmail}
                    onChange={(e) => setAEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="a-password">Password</Label>
                  <Input
                    id="a-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={aPassword}
                    onChange={(e) => setAPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resume">Resume / Summary</Label>
                  <Textarea
                    id="resume"
                    placeholder="Paste your resume text or a brief summary of your experience..."
                    className="min-h-[100px]"
                    value={aResume}
                    onChange={(e) => setAResume(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skills & Interests</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill..."
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addSkill(skillInput)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addSkill(skillInput)}
                    >
                      Add
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => removeSkill(skill)}
                        >
                          {skill}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SUGGESTED_SKILLS.filter((s) => !skills.includes(s))
                      .slice(0, 6)
                      .map((skill) => (
                        <button
                          type="button"
                          key={skill}
                          onClick={() => addSkill(skill)}
                          className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          + {skill}
                        </button>
                      ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objective">Career Objective</Label>
                  <Input
                    id="objective"
                    placeholder="e.g., Full-stack SWE at an early-stage startup"
                    value={aObjective}
                    onChange={(e) => setAObjective(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Creating account…" : "Create Applicant Account"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="company">
              <form
                className="mt-4 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setError("")
                  setLoading(true)
                  try {
                    await signupCompany({
                      email: cEmail,
                      password: cPassword,
                      company_name: cName,
                      website: cWebsite,
                      description: cDescription,
                      company_size: cSize,
                    })
                    router.push("/login?registered=1")
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Signup failed")
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="Acme Inc." value={cName} onChange={(e) => setCName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Company Email</Label>
                  <Input
                    id="c-email"
                    type="email"
                    placeholder="hiring@company.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-password">Password</Label>
                  <Input
                    id="c-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://company.com"
                    value={cWebsite}
                    onChange={(e) => setCWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-desc">Company Description</Label>
                  <Textarea
                    id="company-desc"
                    placeholder="Tell applicants about your company, culture, and mission..."
                    className="min-h-[100px]"
                    value={cDescription}
                    onChange={(e) => setCDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-size">Company Size</Label>
                  <Input
                    id="company-size"
                    placeholder="e.g., 10-50 employees"
                    value={cSize}
                    onChange={(e) => setCSize(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Creating account…" : "Create Company Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
