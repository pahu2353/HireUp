import { getApiUrl } from "@/lib/api"

export interface CompanyJobPostingPayload {
  company_id: string
  title: string
  description: string
  skills: string[]
  location?: string
  salary_range?: string
}

export interface UpdateCompanyJobPostingPayload {
  company_id: string
  job_id: string
  title: string
  description: string
  skills: string[]
  location?: string
  salary_range?: string
}

export interface DeleteCompanyJobPostingPayload {
  company_id: string
  job_id: string
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
  grad_date: string
  linkedin_url: string
  github_url: string
  skills: string[]
  technical_score: number | null
  fit_score: number | null
  fit_reasoning: string
  fit_scored_at: string | null
  skill_analysis: string
  skill_analysis_summary: string
}

export interface CandidateSkillAnalysis {
  mode: "general" | "job_specific"
  source: string
  summary: string
  skills: Array<{ name: string; score: number }>
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

export async function updateCompanyJobPosting(payload: UpdateCompanyJobPostingPayload) {
  return putJson<{ status: string; job: CompanyJob }>("/update-job-posting", payload)
}

export async function deleteCompanyJobPosting(payload: DeleteCompanyJobPostingPayload) {
  return postJson<{ status: string; job: CompanyJob }>("/delete-job-posting", payload)
}

export async function getTopCandidates(
  jobId: string,
  prompt: string,
  limit?: number,
) {
  return postJson<{
    job_id: string
    top_candidates: TopCandidate[]
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

export async function scoreApplicants(companyId: string, jobId?: string, batchSize: number = 5, offset: number = 0) {
  const qs = new URLSearchParams({ company_id: companyId, batch_size: String(batchSize), offset: String(offset) })
  if (jobId) qs.set("job_id", jobId)
  const res = await fetch(`${getApiUrl("/score-applicants")}?${qs.toString()}`, { method: "POST" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as { 
    company_id: string
    job_id?: string
    scored_count: number
    total_unrated: number
    applicants: CompanyApplicant[]
  }
}

export async function updateApplicationStatus(payload: {
  company_id: string
  application_id: string
  status: "submitted" | "rejected_pre_interview" | "in_progress" | "rejected_post_interview" | "offer"
  technical_score?: number
}) {
  return postJson<{ status: string; application: CompanyApplicant }>("/update-application-status", payload)
}

export async function analyzeCandidateSkills(payload: {
  company_id: string
  user_id: string
  job_id?: string
}) {
  return postJson<{ status: string; analysis: CandidateSkillAnalysis }>("/analyze-candidate-skills", payload)
}


// --- Agent Chat Persistence ---

export interface AgentMessageRecord {
  id: string
  chat_id: string
  role: "user" | "assistant"
  content: string
  candidates?: TopCandidate[]
  report_metadata?: string
}

export interface AgentChatRecord {
  chat_id: string
  updated_at: string
  message_count: number
  last_message: string
}

export async function getAgentChats(companyId: string) {
  const url = `${getApiUrl("/agent-chats")}?company_id=${encodeURIComponent(companyId)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as { company_id: string; chats: AgentChatRecord[] }
}

export async function getAgentMessages(companyId: string, chatId?: string) {
  const qs = new URLSearchParams({ company_id: companyId })
  if (chatId) qs.set("chat_id", chatId)
  const url = `${getApiUrl("/agent-messages")}?${qs.toString()}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as { company_id: string; chat_id?: string; messages: AgentMessageRecord[] }
}

export async function saveAgentMessages(
  companyId: string,
  chatId: string,
  messages: Array<{
    message_id: string
    role: string
    content: string
    candidates?: string
    report_metadata?: string
  }>,
) {
  return postJson<{ status: string; count: number }>("/agent-messages", {
    company_id: companyId,
    chat_id: chatId,
    messages: messages.map((m) => ({ company_id: companyId, chat_id: chatId, ...m })),
  })
}

export async function clearAgentMessages(companyId: string, chatId?: string) {
  const qs = new URLSearchParams({ company_id: companyId })
  if (chatId) qs.set("chat_id", chatId)
  const res = await fetch(`${getApiUrl("/agent-messages")}?${qs.toString()}`, { method: "DELETE" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data
}


// --- Custom Reports ---

export interface CustomReport {
  id: string
  company_id: string
  job_id: string | null
  report_name: string
  custom_prompt: string
  created_at: string
}

export interface ReportCandidate {
  user_id: string
  user_name: string
  custom_fit_score: number
  custom_fit_reasoning: string
  skills?: string[]
  skill_summary?: string
}

export interface GenerateReportResponse {
  status: string
  report_id: string
  report_name: string
  custom_prompt: string
  total_scored: number
  top_candidates: ReportCandidate[]
}

export async function generateCustomReport(payload: {
  company_id: string
  job_id: string
  report_name: string
  custom_prompt: string
}): Promise<GenerateReportResponse> {
  return postJson<GenerateReportResponse>("/generate-custom-report", payload)
}

export async function getCustomReports(companyId: string, jobId?: string) {
  const qs = new URLSearchParams({ company_id: companyId })
  if (jobId) qs.set("job_id", jobId)
  const url = `${getApiUrl("/custom-reports")}?${qs.toString()}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as { company_id: string; reports: CustomReport[] }
}

export async function getReportScores(reportId: string) {
  const url = `${getApiUrl("/report-scores")}?report_id=${encodeURIComponent(reportId)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as {
    report_id: string
    report: CustomReport
    scores: Array<{
      id: string
      report_id: string
      application_id: string
      custom_fit_score: number
      custom_fit_reasoning: string
      scored_at: string
    }>
  }
}
