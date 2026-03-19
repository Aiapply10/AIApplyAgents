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

// ── Stats ──

export interface AdminStats {
  users_count: number;
  active_users: number;
  tenants_count: number;
  recent_signups_count: number;
  role_distribution: Record<string, number>;
  recent_users: {
    id: string;
    display_name: string;
    email: string;
    role: string;
    created_at: string;
  }[];
  recent_audit: {
    id: string;
    actor_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
  }[];
}

export function getAdminStats() {
  return request<AdminStats>("/admin/stats");
}

// ── Users ──

export interface AdminUser {
  id: string;
  supertokens_user_id: string;
  tenant_id: string | null;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export function listUsers(skip = 0, limit = 50) {
  return request<AdminUser[]>(`/users?skip=${skip}&limit=${limit}`);
}

export function updateUser(userId: string, data: { display_name?: string; role?: string; is_active?: boolean }) {
  return request<AdminUser>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(userId: string) {
  return request<null>(`/users/${userId}`, { method: "DELETE" });
}

// ── Tenants ──

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function listTenants(skip = 0, limit = 50) {
  return request<AdminTenant[]>(`/tenants?skip=${skip}&limit=${limit}`);
}

export function createTenant(data: { name: string; slug: string; plan?: string; settings?: Record<string, unknown> }) {
  return request<AdminTenant>("/tenants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTenant(tenantId: string, data: { name?: string; plan?: string; settings?: Record<string, unknown>; is_active?: boolean }) {
  return request<AdminTenant>(`/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTenant(tenantId: string) {
  return request<null>(`/tenants/${tenantId}`, { method: "DELETE" });
}

// ── Audit Events ──

export interface AuditEvent {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  detail: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
  created_at: string;
}

export function listAuditEvents(params: { skip?: number; limit?: number; resource_type?: string; actor_id?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.skip) qs.set("skip", String(params.skip));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.resource_type) qs.set("resource_type", params.resource_type);
  if (params.actor_id) qs.set("actor_id", params.actor_id);
  return request<AuditEvent[]>(`/admin/audit-events?${qs.toString()}`);
}

// ── Notifications ──

export interface AdminNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function listNotifications(params: { user_id?: string; status?: string; skip?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.user_id) qs.set("user_id", params.user_id);
  if (params.status) qs.set("status", params.status);
  if (params.skip) qs.set("skip", String(params.skip));
  if (params.limit) qs.set("limit", String(params.limit));
  return request<AdminNotification[]>(`/admin/notifications?${qs.toString()}`);
}

export function createNotification(data: { user_id: string; type: string; title: string; body: string; link?: string }) {
  return request<AdminNotification>("/admin/notifications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function markNotificationRead(notificationId: string) {
  return request<{ ok: boolean }>(`/admin/notifications/${notificationId}/read`, { method: "POST" });
}

export function markAllNotificationsRead(userId: string) {
  return request<{ ok: boolean; marked: number }>(`/admin/notifications/read-all?user_id=${userId}`, { method: "POST" });
}
