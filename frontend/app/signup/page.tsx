"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { X } from "lucide-react"

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
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")

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
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="a-email">Email</Label>
                  <Input
                    id="a-email"
                    type="email"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="a-password">Password</Label>
                  <Input
                    id="a-password"
                    type="password"
                    placeholder="Create a strong password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resume">Resume / Summary</Label>
                  <Textarea
                    id="resume"
                    placeholder="Paste your resume text or a brief summary of your experience..."
                    className="min-h-[100px]"
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
                  />
                </div>
                <Button className="w-full" type="submit">
                  Create Applicant Account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="company">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Company Email</Label>
                  <Input
                    id="c-email"
                    type="email"
                    placeholder="hiring@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-password">Password</Label>
                  <Input
                    id="c-password"
                    type="password"
                    placeholder="Create a strong password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-desc">Company Description</Label>
                  <Textarea
                    id="company-desc"
                    placeholder="Tell applicants about your company, culture, and mission..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-size">Company Size</Label>
                  <Input
                    id="company-size"
                    placeholder="e.g., 10-50 employees"
                  />
                </div>
                <Button className="w-full" type="submit">
                  Create Company Account
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
