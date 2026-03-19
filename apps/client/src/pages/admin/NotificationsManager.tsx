import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  createNotification,
  markNotificationRead,
  type AdminNotification,
} from "../../lib/admin-api";
import Select from "../../components/Select";

const statusColors: Record<string, string> = {
  unread: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  read: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
  dismissed: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const typeColors: Record<string, string> = {
  application_submitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  workflow_completed: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  error: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
};

const statusFilterOptions = [
  { value: "", label: "All Status" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "dismissed", label: "Dismissed" },
];

const typeOptions = [
  { value: "info", label: "Info" },
  { value: "application_submitted", label: "Application Submitted" },
  { value: "workflow_completed", label: "Workflow Completed" },
  { value: "error", label: "Error" },
];

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNotif, setNewNotif] = useState({ user_id: "", type: "info", title: "", body: "", link: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await listNotifications({
      user_id: userIdFilter || undefined,
      status: statusFilter || undefined,
      limit: 50,
    });
    if (res.error) setError(res.error);
    else setNotifications(res.data || []);
    setLoading(false);
  }, [userIdFilter, statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!newNotif.user_id || !newNotif.title || !newNotif.body) return;
    setSaving(true);
    const data: { user_id: string; type: string; title: string; body: string; link?: string } = {
      user_id: newNotif.user_id,
      type: newNotif.type,
      title: newNotif.title,
      body: newNotif.body,
    };
    if (newNotif.link) data.link = newNotif.link;
    await createNotification(data);
    setSaving(false);
    setCreating(false);
    setNewNotif({ user_id: "", type: "info", title: "", body: "", link: "" });
    refresh();
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    refresh();
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Notifications</h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">Manage system notifications</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">Send Notification</button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) placeholder:text-(--color-text-tertiary) outline-none input-glow focus:border-(--color-accent)"
        />
        <Select value={statusFilter} onChange={setStatusFilter} options={statusFilterOptions} />
      </div>

      {error && (
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-sm text-(--color-error)">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-lg animate-shimmer" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-(--color-text-tertiary)">No notifications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--color-border)">
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="zebra-row row-hover border-b border-(--color-border-subtle) last:border-0">
                    <td className="py-2.5 px-4 text-(--color-text-secondary) font-mono text-[10px]">{n.user_id.slice(0, 12)}...</td>
                    <td className="py-2.5 px-4">
                      <span className={`status-pill ${typeColors[n.type] || typeColors.info}`}>{n.type}</span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-(--color-text) max-w-[200px] truncate">{n.title}</td>
                    <td className="py-2.5 px-4">
                      <span className={`status-pill ${statusColors[n.status] || statusColors.unread}`}>{n.status}</span>
                    </td>
                    <td className="py-2.5 px-4 text-(--color-text-tertiary) whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right">
                      {n.status === "unread" && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold text-(--color-accent) hover:bg-(--color-accent-subtle) transition-colors cursor-pointer"
                        >
                          Mark Read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <h3 className="font-display text-lg font-bold text-(--color-text) mb-4">Send Notification</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Target User ID</label>
              <input type="text" value={newNotif.user_id} onChange={(e) => setNewNotif({ ...newNotif, user_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)"
                placeholder="User ObjectId" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Type</label>
              <Select
                value={newNotif.type}
                onChange={(v) => setNewNotif({ ...newNotif, type: v })}
                options={typeOptions}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Title</label>
              <input type="text" value={newNotif.title} onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Body</label>
              <textarea value={newNotif.body} onChange={(e) => setNewNotif({ ...newNotif, body: e.target.value })} rows={3}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent) resize-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Link (optional)</label>
              <input type="text" value={newNotif.link} onChange={(e) => setNewNotif({ ...newNotif, link: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)"
                placeholder="/path/to/page" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setCreating(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? "Sending..." : "Send"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md animate-fade-up" style={{ animationDuration: "0.2s" }}>
        {children}
      </div>
    </div>
  );
}
