const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  opts: RequestInit = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    if (res.status === 404) return { data: null, error: null, status: 404 };
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { data: null, error: body?.detail || `Request failed (${res.status})`, status: res.status };
    }
    const data = res.status === 204 ? null : await res.json();
    return { data: data as T, error: null, status: res.status };
  } catch {
    return { data: null, error: "Network error", status: 0 };
  }
}

// ── Types ──

export interface ResumeSection {
  id: string;
  title: string;
  type: "text" | "list" | "entries";
  content: string;
  items: string[];
  entries: Record<string, unknown>[];
  visible: boolean;
  order: number;
}

export interface Resume {
  _id: string;
  title: string;
  target_role: string;
  sections: ResumeSection[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── API ──

export async function listResumes() {
  return request<Resume[]>("/resumes");
}

export async function getResume(id: string) {
  return request<Resume>(`/resumes/${id}`);
}

export async function createResume(data: {
  title: string;
  target_role?: string;
  sections?: ResumeSection[];
}) {
  return request<Resume>("/resumes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createResumeFromProfile() {
  return request<Resume>("/resumes/from-profile", { method: "POST" });
}

export async function createResumeFromMarkdown(data: {
  title?: string;
  target_role?: string;
  markdown: string;
}) {
  return request<Resume>("/resumes/from-markdown", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateResume(
  id: string,
  data: Partial<Pick<Resume, "title" | "target_role" | "sections" | "is_default">>,
) {
  return request<Resume>(`/resumes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteResume(id: string) {
  return request<null>(`/resumes/${id}`, { method: "DELETE" });
}

export interface AnalysisCategory {
  name: string;
  score: number;
  max: number;
  detail: string;
}

export interface AnalysisResult {
  score: number;
  grade: string;
  interpretation: string;
  target_role: string;
  categories: AnalysisCategory[];
  summary: {
    sections_found: number;
    total_skills: number;
    experience_entries: number;
    bullet_points: number;
    quantified_bullets: number;
    strong_verbs: number;
    weak_verbs: number;
    word_count: number;
  };
  issues: Array<{ severity: string; section: string; message: string }>;
  suggestions: Array<{ section: string; message: string }>;
  missing_keywords: string[];
}

export async function extractResumeFromFile(file: File) {
  const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(`${BASE}/resumes/extract`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { data: null as Resume | null, error: body?.detail || `Request failed (${res.status})`, status: res.status };
    }
    const data = await res.json();
    return { data: data as Resume, error: null as string | null, status: res.status };
  } catch {
    return { data: null as Resume | null, error: "Network error" as string | null, status: 0 };
  }
}

export async function analyzeResume(id: string, targetRole?: string, jobDescription?: string) {
  return request<AnalysisResult>(`/resumes/${id}/analyze`, {
    method: "POST",
    body: JSON.stringify({ target_role: targetRole || "", job_description: jobDescription || "" }),
  });
}

// ── Master Sections ──

export interface MasterSections {
  id?: string;
  user_id: string;
  tenant_id: string;
  sections: ResumeSection[];
  created_at?: string;
  updated_at?: string;
}

export async function getMasterSections() {
  return request<MasterSections>("/master-sections");
}

export async function updateMasterSections(sections: ResumeSection[]) {
  return request<MasterSections>("/master-sections", {
    method: "PUT",
    body: JSON.stringify({ sections }),
  });
}

export async function importToMasterSections(resumeId: string) {
  return request<MasterSections>(`/master-sections/import/${resumeId}`, { method: "POST" });
}

export async function tailorResume(data: { target_role: string; job_description?: string; title?: string }) {
  return request<Resume>("/master-sections/tailor", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
