const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  opts: RequestInit = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
      },
    });

    if (res.status === 404) {
      return { data: null, error: null, status: 404 };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.detail || `Request failed (${res.status})`;
      return { data: null, error: msg, status: res.status };
    }

    const data = res.status === 204 ? null : await res.json();
    return { data: data as T, error: null, status: res.status };
  } catch {
    return { data: null, error: "Network error", status: 0 };
  }
}

export interface UserProfile {
  _id?: string;
  full_name: string;
  avatar_url: string;
  headline: string;
  summary: string;
  location: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  skills: string[];
  experience: Record<string, unknown>[];
  education: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
}

export interface MeResponse {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

export async function getMe() {
  return request<MeResponse>("/me");
}

export async function getProfile(userId: string) {
  return request<UserProfile>(`/users/${userId}/profile`);
}

export async function upsertProfile(userId: string, data: Partial<UserProfile>) {
  return request<UserProfile>(`/users/${userId}/profile`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
