import { getApiUrl } from "@/lib/api"

export interface CompanyJobPostingPayload {
  company_id: string
  title: string
  description: string
  skills: string[]
  location?: string
  salary_range?: string
}

export interface TopCandidate {
  user_id: string
  skills: string[]
  score: number
  reasoning: string
}

export interface CompanyProfile {
  company_id: string
  email: string
  company_name: string
  website: string
  description: string
  company_size: string
  stage: string
  culture_benefits: string
}

export interface CompanyDashboardResponse {
  company_id: string
  stats: {
    active_postings: number
    total_applicants: number
    ai_agent_queries: number
    interview_rate_percent: number
  }
  recent_activity: Array<{
    action: string
    detail: string
    time: string
  }>
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as T
}

async function putJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as T
}

export async function createCompanyJobPosting(payload: CompanyJobPostingPayload) {
  return postJson<{ status: string; job_id: string }>("/create-job-posting", payload)
}

export async function getTopCandidates(jobId: string, prompt: string) {
  return postJson<{ job_id: string; top_candidates: TopCandidate[] }>("/get-top-candidates", {
    job_id: jobId,
    prompt,
  })
}

export async function submitIntervieweeList(jobId: string, userIds: string[]) {
  return postJson<{ status: string; job_id: string; user_ids: string[] }>(
    "/submit-interviewee-list",
    { job_id: jobId, user_ids: userIds },
  )
}

export async function getCompanyProfile(companyId: string) {
  const url = `${getApiUrl("/company-profile")}?company_id=${encodeURIComponent(companyId)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as CompanyProfile
}

export async function updateCompanyProfile(payload: CompanyProfile) {
  return putJson<{ status: string; profile: CompanyProfile }>("/company-profile", payload)
}

export async function getCompanyDashboard(companyId: string) {
  const url = `${getApiUrl("/company-dashboard")}?company_id=${encodeURIComponent(companyId)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as CompanyDashboardResponse
}
