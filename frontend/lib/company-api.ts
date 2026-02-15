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
  name?: string
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
  workflow: {
    submitted: number
    rejected_pre_interview: number
    in_progress: number
    rejected_post_interview: number
    offer: number
  }
  recent_activity: Array<{
    action: string
    detail: string
    time: string
  }>
}

export interface CompanyJob {
  id: string
  company_id: string
  title: string
  description: string
  skills: string[]
  location: string
  salary_range: string
  status: string
  created_at: string
}

export interface CompanyApplicant {
  application_id: string
  user_id: string
  job_id: string
  status: string
  created_at: string
  job_title: string
  user_name: string
  user_email: string
  resume_text: string
  skills: string[]
  technical_score: number | null
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

export async function getTopCandidates(
  jobId: string,
  prompt: string,
  limit?: number,
) {
  return postJson<{
    job_id: string
    top_candidates: TopCandidate[]
    ranking_source?: "openai" | "fallback" | "none" | "unknown"
    ranking_error?: string
  }>("/get-top-candidates", {
    job_id: jobId,
    prompt,
    limit: limit ?? undefined,
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

export async function getCompanyJobs(companyId: string) {
  const url = `${getApiUrl("/get-company-jobs")}?company_id=${encodeURIComponent(companyId)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as { company_id: string; jobs: CompanyJob[] }
}

export async function getCompanyApplicants(companyId: string, jobId?: string) {
  const qs = new URLSearchParams({ company_id: companyId })
  if (jobId) qs.set("job_id", jobId)
  const url = `${getApiUrl("/get-company-applicants")}?${qs.toString()}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as { company_id: string; job_id?: string; applicants: CompanyApplicant[] }
}

export async function updateApplicationStatus(payload: {
  company_id: string
  application_id: string
  status: "submitted" | "rejected_pre_interview" | "in_progress" | "rejected_post_interview" | "offer"
  technical_score?: number
}) {
  return postJson<{ status: string; application: CompanyApplicant }>("/update-application-status", payload)
}
