"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, X, ExternalLink } from "lucide-react"
import { getAuth, getProfile, updateProfile, getResumeUrl } from "@/lib/api"

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

export default function ApplicantProfilePage() {
  const [userId, setUserId] = useState<string>("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [careerObjective, setCareerObjective] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [resumePdf, setResumePdf] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState("")
  const [hasResumePdf, setHasResumePdf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "user") {
      window.location.href = "/login"
      return
    }
    setUserId(auth.id)
    getProfile(auth.id)
      .then((profile) => {
        setName(profile.name || "")
        setEmail(profile.email || "")
        setCareerObjective(profile.career_objective || "")
        setResumeText(profile.resume_text || "")
        setHasResumePdf(profile.has_resume_pdf || false)
        try {
          const interests = JSON.parse(profile.interests || "[]")
          setSkills(Array.isArray(interests) ? interests : [])
        } catch {
          setSkills([])
        }
      })
      .catch((err) => {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
      })
      .finally(() => setLoading(false))
  }, [])

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

  const handleSave = async () => {
    setError("")
    setSuccess(false)
    setSaving(true)
    try {
      let resumePdfBase64: string | undefined
      if (resumePdf) {
        const buf = await resumePdf.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ""
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        resumePdfBase64 = btoa(binary)
      }
      await updateProfile(userId, {
        name,
        email,
        careerObjective,
        interests: skills,
        resumePdfBase64,
      })
      setSuccess(true)
      setResumePdf(null)
      // Refresh profile to update hasResumePdf flag
      const updatedProfile = await getProfile(userId)
      setHasResumePdf(updatedProfile.has_resume_pdf || false)
      setResumeText(updatedProfile.resume_text || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell role="applicant">
        <p className="text-muted-foreground">Loading profile...</p>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="applicant">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Keep your profile up to date for better matches.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Full Name</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input
                id="p-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-objective">Career Objective</Label>
              <Input
                id="p-objective"
                value={careerObjective}
                onChange={(e) => setCareerObjective(e.target.value)}
                placeholder="e.g., Full-stack SWE at an early-stage startup"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasResumePdf && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Resume PDF</p>
                      <p className="text-xs text-muted-foreground">Your current resume is on file</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getResumeUrl(userId), '_blank')}
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    View Resume
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="p-resume-pdf">
                {hasResumePdf ? "Replace Resume PDF (optional)" : "Upload PDF (optional)"}
              </Label>
              <label
                htmlFor="p-resume-pdf"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <input
                  id="p-resume-pdf"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setResumePdf(e.target.files?.[0] ?? null)}
                />
                <FileText className="h-4 w-4 shrink-0" />
                {resumePdf ? resumePdf.name : "Upload new PDF"}
              </label>
            </div>
            <div className="space-y-2">
              <Label>Current Resume Text</Label>
              <Textarea
                value={resumeText}
                readOnly
                className="min-h-[120px] cursor-not-allowed bg-muted text-muted-foreground"
                placeholder="Resume text will appear here after upload"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SKILLS.filter((s) => !skills.includes(s))
                .slice(0, 8)
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
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully!</p>}
        
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </DashboardShell>
  )
}
