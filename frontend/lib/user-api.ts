import { getApiUrl } from "@/lib/api"

export interface UserProfile {
  user_id: string
  email: string
  first_name: string
  last_name: string
  objective: string
  resume: string
  skills: string[]
  grad_date: string
  linkedin_url: string
  github_url: string
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

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const url = `${getApiUrl("/user-profile")}?user_id=${encodeURIComponent(userId)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Request failed")
  return data as UserProfile
}

export async function updateUserProfile(payload: UserProfile) {
  return putJson<{ status: string; profile: UserProfile }>("/user-profile", payload)
}
