export interface CompanyPosting {
  id: string
  title: string
  location: string
  salary: string
  type: string
  description: string
  requirements: string[]
  applicantCount: number
  status: "active" | "paused" | "closed"
  companyId: string
}

const STORAGE_KEY = "hireup_company_postings"

function readAll(): CompanyPosting[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CompanyPosting[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getCompanyPostings(companyId: string): CompanyPosting[] {
  return readAll().filter((p) => p.companyId === companyId)
}

export function saveCompanyPostings(companyId: string, postings: CompanyPosting[]) {
  if (typeof window === "undefined") return
  const otherCompanies = readAll().filter((p) => p.companyId !== companyId)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherCompanies, ...postings]))
}
