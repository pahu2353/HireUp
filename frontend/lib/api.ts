const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export const AUTH_TOKEN_KEY = "hireup_token"
export const AUTH_ACCOUNT_TYPE_KEY = "hireup_account_type"
export const AUTH_ID_KEY = "hireup_id"

export function getApiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}

export type AccountType = "user" | "company"

export function setAuth(token: string, accountType: AccountType, id: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(AUTH_ACCOUNT_TYPE_KEY, accountType)
  window.localStorage.setItem(AUTH_ID_KEY, id)
}

export function getAuth(): { token: string; accountType: AccountType; id: string } | null {
  if (typeof window === "undefined") return null
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  const accountType = window.localStorage.getItem(AUTH_ACCOUNT_TYPE_KEY) as AccountType | null
  const id = window.localStorage.getItem(AUTH_ID_KEY)
  if (!token || !accountType || !id) return null
  return { token, accountType, id }
}

export function clearAuth() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_ACCOUNT_TYPE_KEY)
  window.localStorage.removeItem(AUTH_ID_KEY)
}

export async function login(accountType: AccountType, email: string, password: string) {
  const res = await fetch(getApiUrl("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_type: accountType, email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Login failed")
  return data as { status: string; token: string; account_type: string; id: string }
}

export async function signupUser(payload: {
  email: string
  password: string
  name?: string
  objective?: string
  careerObjective?: string
  resume?: string
  resumePdfBase64?: string
  interests?: string[]
  gradDate?: string
  linkedinUrl?: string
  githubUrl?: string
}) {
  const res = await fetch(getApiUrl("/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_type: "user",
      email: payload.email,
      password: payload.password,
      name: payload.name ?? "",
      objective: payload.objective ?? "",
      career_objective: payload.careerObjective ?? payload.objective ?? "",
      resume: payload.resume ?? "",
      resume_pdf_base64: payload.resumePdfBase64 ?? undefined,
      interests: payload.interests ?? [],
      grad_date: payload.gradDate ?? "",
      linkedin_url: payload.linkedinUrl ?? "",
      github_url: payload.githubUrl ?? "",
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Signup failed")
  return data as { status: string; id: string; account_type: string }
}

export async function signupCompany(payload: {
  email: string
  password: string
  company_name?: string
  website?: string
  description?: string
  company_size?: string
}) {
  const res = await fetch(getApiUrl("/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_type: "company",
      email: payload.email,
      password: payload.password,
      company_name: payload.company_name ?? "",
      website: payload.website ?? "",
      description: payload.description ?? "",
      company_size: payload.company_size ?? "",
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Signup failed")
  return data as { status: string; id: string; account_type: string }
}

export async function getProfile(userId: string) {
  const res = await fetch(getApiUrl(`/profile/${userId}`), {
    method: "GET",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to fetch profile")
  return data.profile
}

export function getResumeUrl(userId: string): string {
  return getApiUrl(`/resume/${userId}`)
}

export async function updateProfile(userId: string, payload: {
  name?: string
  email?: string
  resumePdfBase64?: string
  interests?: string[]
  careerObjective?: string
  gradDate?: string
  linkedinUrl?: string
  githubUrl?: string
}) {
  const res = await fetch(getApiUrl(`/profile/${userId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      resume_pdf_base64: payload.resumePdfBase64,
      interests: payload.interests,
      career_objective: payload.careerObjective,
      grad_date: payload.gradDate,
      linkedin_url: payload.linkedinUrl,
      github_url: payload.githubUrl,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to update profile")
  return data.profile
}

export async function getMatchedJobs(userId: string) {
  const res = await fetch(getApiUrl(`/get-matched-jobs?user_id=${userId}`), {
    method: "GET",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to fetch matched jobs")
  return data.matched_jobs
}

export async function applyJob(userId: string, jobId: string) {
  const res = await fetch(getApiUrl("/apply-job"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, job_id: jobId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to apply for job")
  return data.application
}

export async function createJobPosting(payload: {
  company_id: string
  title: string
  description?: string
  skills?: string[]
  location?: string
  salary_range?: string
}) {
  const res = await fetch(getApiUrl("/create-job-posting"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to create job posting")
  return data.job_id
}

export async function getCompanyJobs(companyId: string) {
  const res = await fetch(getApiUrl(`/get-company-jobs?company_id=${companyId}`), {
    method: "GET",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to fetch company jobs")
  return data.jobs
}

export async function getUserApplications(userId: string) {
  const res = await fetch(getApiUrl(`/applications/${userId}`), {
    method: "GET",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? "Failed to fetch applications")
  return data.applications
}
