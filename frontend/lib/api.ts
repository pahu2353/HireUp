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
  resume?: string
  interests?: string[]
}) {
  const res = await fetch(getApiUrl("/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_type: "user",
      email: payload.email,
      password: payload.password,
      name: payload.name ?? "",
      resume: payload.resume ?? "",
      interests: payload.interests ?? [],
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
