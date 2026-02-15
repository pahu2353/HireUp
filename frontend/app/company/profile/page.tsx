"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuth } from "@/lib/api"
import { CompanyProfile, getCompanyProfile, updateCompanyProfile } from "@/lib/company-api"
import { Check } from "lucide-react"

const emptyProfile: CompanyProfile = {
  company_id: "",
  email: "",
  company_name: "",
  website: "",
  description: "",
  company_size: "",
  stage: "",
  culture_benefits: "",
}

function sanitizeProfile(data: CompanyProfile): CompanyProfile {
  return {
    company_id: data.company_id ?? "",
    email: data.email ?? "",
    company_name: data.company_name ?? "",
    website: data.website ?? "",
    description: data.description ?? "",
    company_size: data.company_size ?? "",
    stage: data.stage ?? "",
    culture_benefits: data.culture_benefits ?? "",
  }
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || auth.accountType !== "company") {
      setError("Log in as a company account to manage profile.")
      return
    }
    getCompanyProfile(auth.id)
      .then((data) => setProfile(sanitizeProfile(data)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
  }, [])

  const saveProfile = async () => {
    if (!profile.company_id) return
    setError("")
    setInfo("")
    setSaveSuccess(false)
    setIsSaving(true)
    try {
      const res = await updateCompanyProfile(profile)
      setProfile(sanitizeProfile(res.profile))
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

  return (
    <DashboardShell role="company">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
        <p className="mt-1 text-muted-foreground">Manage company information from backend profile endpoints.</p>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-name">Company Name</Label>
                <Input
                  id="cp-name"
                  value={profile.company_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-website">Website</Label>
                <Input
                  id="cp-website"
                  value={profile.website ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp-size">Company Size</Label>
                <Input
                  id="cp-size"
                  value={profile.company_size ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, company_size: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-stage">Stage</Label>
                <Input
                  id="cp-stage"
                  value={profile.stage ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, stage: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={profile.description ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Culture & Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={profile.culture_benefits ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, culture_benefits: e.target.value }))}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Button 
          onClick={saveProfile} 
          disabled={isSaving || !profile.company_id}
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
