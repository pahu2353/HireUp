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
import { BrandLogo } from "@/components/brand/logo"
import { X, FileText } from "lucide-react"
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
  const [aResumePdf, setAResumePdf] = useState<File | null>(null)
  const [aObjective, setAObjective] = useState("")
  const [aGradDate, setAGradDate] = useState("")
  const [aLinkedinUrl, setALinkedinUrl] = useState("")
  const [aGithubUrl, setAGithubUrl] = useState("")
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
    <div className="relative flex min-h-screen gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="app-shell hidden w-1/2 flex-col justify-between bg-gradient-to-br from-card via-card to-chart-2/10 p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={36} className="h-9 w-9" />
          <span className="text-lg font-bold text-foreground">HireUp</span>
        </Link>
        <div>
          <p className="eyebrow mb-5">New Account</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-[-0.02em] text-foreground">
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

      <div className="flex w-full flex-col items-center justify-center py-8 lg:w-1/2">
        <div className="app-shell w-full max-w-lg p-6 md:p-8">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo size={32} className="h-8 w-8" />
              <span className="text-lg font-bold text-foreground">HireUp</span>
            </Link>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your role to get started.
          </p>

          <Tabs defaultValue="applicant" className="mt-6">
            <TabsList className="w-full rounded-xl bg-secondary/60">
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
                    let resumePdfBase64: string | undefined
                    if (aResumePdf) {
                      const buf = await aResumePdf.arrayBuffer()
                      const bytes = new Uint8Array(buf)
                      let binary = ""
                      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
                      resumePdfBase64 = btoa(binary)
                    }
                    await signupUser({
                      email: aEmail,
                      password: aPassword,
                      name: [aFirstName, aLastName].filter(Boolean).join(" ") || "Applicant",
                      objective: aObjective || undefined,
                      careerObjective: aObjective || undefined,
                      resume: aResume || undefined,
                      resumePdfBase64,
                      interests: skills,
                      gradDate: aGradDate || undefined,
                      linkedinUrl: aLinkedinUrl || undefined,
                      githubUrl: aGithubUrl || undefined,
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
                  <Label htmlFor="resume">Resume (PDF)</Label>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="resume"
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      <input
                        id="resume"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setAResumePdf(e.target.files?.[0] ?? null)}
                      />
                      <FileText className="h-4 w-4 shrink-0" />
                      {aResumePdf ? aResumePdf.name : "Upload PDF"}
                    </label>
                    <p className="text-xs text-muted-foreground">Or paste text below</p>
                    <Textarea
                      placeholder="Paste resume text as fallback..."
                      className="min-h-[80px]"
                      value={aResume}
                      onChange={(e) => setAResume(e.target.value)}
                    />
                  </div>
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
                <div className="space-y-2">
                  <Label htmlFor="grad-date">Graduation Date (Optional)</Label>
                  <Input
                    id="grad-date"
                    type="month"
                    value={aGradDate}
                    onChange={(e) => setAGradDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url">LinkedIn URL (Optional)</Label>
                  <Input
                    id="linkedin-url"
                    type="url"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={aLinkedinUrl}
                    onChange={(e) => setALinkedinUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-url">GitHub URL (Optional)</Label>
                  <Input
                    id="github-url"
                    type="url"
                    placeholder="https://github.com/your-username"
                    value={aGithubUrl}
                    onChange={(e) => setAGithubUrl(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full rounded-full" type="submit" disabled={loading}>
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
                <Button className="w-full rounded-full" type="submit" disabled={loading}>
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
