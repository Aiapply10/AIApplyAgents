import { useCallback, useEffect, useState } from "react";
import { listUsers, updateUser, deleteUser, type AdminUser } from "../../lib/admin-api";
import Select from "../../components/Select";

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  manager: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  member: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
};

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const editRoleOptions = [
  { value: "member", label: "Member" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await listUsers(0, 200);
    if (res.error) setError(res.error);
    else setUsers(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !u.display_name.toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.is_active) return false;
    if (statusFilter === "inactive" && u.is_active) return false;
    return true;
  });

  async function handleSaveEdit() {
    if (!editUser) return;
    setSaving(true);
    await updateUser(editUser.id, {
      display_name: editUser.display_name,
      role: editUser.role,
      is_active: editUser.is_active,
    });
    setSaving(false);
    setEditUser(null);
    refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    await deleteUser(confirmDelete.id);
    setSaving(false);
    setConfirmDelete(null);
    refresh();
  }

  async function handleToggleActive(u: AdminUser) {
    await updateUser(u.id, { is_active: !u.is_active });
    refresh();
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Users</h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">{users.length} total users</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) placeholder:text-(--color-text-tertiary) outline-none input-glow focus:border-(--color-accent)"
        />
        <Select value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
        <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
      </div>

      {error && (
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-sm text-(--color-error)">{error}</p>
        </div>
      )}

      {/* User table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg animate-shimmer" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-(--color-text-tertiary)">No users match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--color-border)">
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Joined</th>
                  <th className="text-right py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="zebra-row row-hover border-b border-(--color-border-subtle) last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full accent-gradient flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {u.display_name ? u.display_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?"}
                        </div>
                        <span className="font-semibold text-(--color-text)">{u.display_name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-(--color-text-secondary)">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`status-pill ${roleBadgeColors[u.role] || roleBadgeColors.member}`}>{u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-(--color-text-tertiary)"}`} />
                        <span className="text-(--color-text-secondary)">{u.is_active ? "Active" : "Inactive"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-(--color-text-tertiary)">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditUser({ ...u })} className="px-2 py-1 rounded-md text-[11px] font-semibold text-(--color-accent) hover:bg-(--color-accent-subtle) transition-colors cursor-pointer">Edit</button>
                        <button onClick={() => handleToggleActive(u)} className="px-2 py-1 rounded-md text-[11px] font-semibold text-(--color-text-secondary) hover:bg-(--color-surface-sunken) transition-colors cursor-pointer">
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => setConfirmDelete(u)} className="px-2 py-1 rounded-md text-[11px] font-semibold text-(--color-error) hover:bg-(--color-error-bg) transition-colors cursor-pointer">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <h3 className="font-display text-lg font-bold text-(--color-text) mb-4">Edit User</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Display Name</label>
              <input
                type="text"
                value={editUser.display_name}
                onChange={(e) => setEditUser({ ...editUser, display_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Role</label>
              <Select
                value={editUser.role}
                onChange={(v) => setEditUser({ ...editUser, role: v })}
                options={editRoleOptions}
                fullWidth
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider">Active</label>
              <button
                onClick={() => setEditUser({ ...editUser, is_active: !editUser.is_active })}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${editUser.is_active ? "bg-emerald-500" : "bg-(--color-border)"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${editUser.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditUser(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h3 className="font-display text-lg font-bold text-(--color-text) mb-2">Delete User</h3>
          <p className="text-sm text-(--color-text-secondary) mb-6">
            Are you sure you want to delete <span className="font-semibold text-(--color-text)">{confirmDelete.display_name || confirmDelete.email}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-lg bg-(--color-error) text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer">
              {saving ? "Deleting..." : "Delete"}
            </button>
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
