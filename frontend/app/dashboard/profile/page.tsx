"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuth, getResumeUrl } from "@/lib/api"
import { getUserProfile, updateUserProfile, UserProfile } from "@/lib/user-api"
import { Check } from "lucide-react"

const emptyProfile: UserProfile = {
  user_id: "",
  email: "",
  first_name: "",
  last_name: "",
  objective: "",
  resume: "",
  skills: [],
}

function sanitizeProfile(data: UserProfile): UserProfile {
  return {
    user_id: data.user_id ?? "",
    email: data.email ?? "",
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    objective: data.objective ?? "",
    resume: data.resume ?? "",
    skills: Array.isArray(data.skills) ? data.skills.map((s) => String(s)) : [],
  }
}

export default function ApplicantProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile)
  const [skillsInput, setSkillsInput] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasResumePdf, setHasResumePdf] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "user") {
      setError("Log in as an applicant account to manage profile.")
      return
    }
    getUserProfile(auth.id)
      .then((data) => {
        const p = sanitizeProfile(data)
        setProfile(p)
        setSkillsInput(p.skills.join(", "))
        setHasResumePdf((data as any).has_resume_pdf ?? false)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
  }, [])

  const saveChanges = async () => {
    if (!profile.user_id) return
    setError("")
    setInfo("")
    setSaveSuccess(false)
    setIsSaving(true)
    try {
      const payload: UserProfile = {
        ...profile,
        skills: skillsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }
      const res = await updateUserProfile(payload)
      const p = sanitizeProfile(res.profile)
      setProfile(p)
      setSkillsInput(p.skills.join(", "))
      setInfo("Profile saved.")
      setSaveSuccess(true)
      // Reset success state after animation
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile.user_id) return
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file")
      return
    }
    setError("")
    setInfo("")
    setIsUploadingResume(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string
          const pdfBase64 = base64.split(",")[1]
          const response = await fetch(`http://localhost:8000/users/upload-resume/${profile.user_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdf_base64: pdfBase64 }),
          })
          if (!response.ok) throw new Error("Failed to upload resume")
          setInfo("Resume uploaded successfully")
          setHasResumePdf(true)
          // Refresh profile to get updated resume_text
          const refreshed = await getUserProfile(profile.user_id)
          const p = sanitizeProfile(refreshed)
          setProfile(p)
          setSkillsInput(p.skills.join(", "))
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to upload resume")
        } finally {
          setIsUploadingResume(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resume")
      setIsUploadingResume(false)
    }
  }

  return (
    <DashboardShell role="applicant">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">Keep your profile up to date for better matches.</p>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-first">First Name</Label>
                <Input
                  id="p-first"
                  value={profile.first_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-last">Last Name</Label>
                <Input
                  id="p-last"
                  value={profile.last_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input
                id="p-email"
                value={profile.email ?? ""}
                readOnly
                className="text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-objective">Career Objective</Label>
              <Input
                id="p-objective"
                value={profile.objective ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, objective: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume-upload">
                {hasResumePdf ? "Replace Resume (PDF)" : "Upload Resume (PDF)"}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  disabled={isUploadingResume}
                  className="flex-1"
                />
                {hasResumePdf && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = getResumeUrl(profile.user_id)
                      window.open(url, "_blank")
                    }}
                  >
                    View Resume
                  </Button>
                )}
              </div>
              {isUploadingResume && (
                <p className="text-sm text-muted-foreground">Uploading and processing resume...</p>
              )}
            </div>
            {profile.resume && (
              <div className="space-y-2">
                <Label>Resume Text (Auto-extracted)</Label>
                <Textarea
                  value={profile.resume ?? ""}
                  readOnly
                  disabled
                  className="min-h-[200px] bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Comma separated skills"
            />
            <div className="flex flex-wrap gap-2">
              {skillsInput
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((skill, index) => (
                  <Badge key={`${skill}-${index}`} variant="secondary">
                    {skill}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={saveChanges} 
          disabled={isSaving || !profile.user_id}
          className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isSaving ? (
            "Saving..."
          ) : saveSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </DashboardShell>
  )
}
