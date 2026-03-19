import { useCallback, useEffect, useState } from "react";
import { listTenants, createTenant, updateTenant, deleteTenant, type AdminTenant } from "../../lib/admin-api";
import Select from "../../components/Select";

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const planOptions = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

export default function TenantManagement() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editTenant, setEditTenant] = useState<AdminTenant | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", plan: "free" });
  const [confirmDelete, setConfirmDelete] = useState<AdminTenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsJson, setSettingsJson] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await listTenants(0, 200);
    if (res.error) setError(res.error);
    else setTenants(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!newTenant.name || !newTenant.slug) return;
    setSaving(true);
    await createTenant(newTenant);
    setSaving(false);
    setCreating(false);
    setNewTenant({ name: "", slug: "", plan: "free" });
    refresh();
  }

  async function handleSaveEdit() {
    if (!editTenant) return;
    setSaving(true);
    let settings = editTenant.settings;
    try { settings = JSON.parse(settingsJson); } catch { /* keep existing */ }
    await updateTenant(editTenant.id, {
      name: editTenant.name,
      plan: editTenant.plan,
      settings,
      is_active: editTenant.is_active,
    });
    setSaving(false);
    setEditTenant(null);
    refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    await deleteTenant(confirmDelete.id);
    setSaving(false);
    setConfirmDelete(null);
    refresh();
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Tenants</h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">{tenants.length} tenants</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">New Tenant</button>
      </div>

      {error && (
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-sm text-(--color-error)">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 h-40 animate-shimmer" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-sm text-(--color-text-tertiary)">No tenants found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-(--color-text)">{t.name}</h3>
                  <p className="text-[11px] text-(--color-text-tertiary) font-mono">{t.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`status-pill ${planColors[t.plan] || planColors.free}`}>{t.plan}</span>
                  <span className={`w-2 h-2 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-(--color-text-tertiary)"}`} />
                </div>
              </div>
              {Object.keys(t.settings).length > 0 && (
                <div className="mb-3 px-2 py-1.5 rounded-lg bg-(--color-surface-sunken) text-[10px] font-mono text-(--color-text-tertiary) overflow-hidden max-h-16">
                  {JSON.stringify(t.settings, null, 2).slice(0, 100)}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-(--color-border-subtle)">
                <span className="text-[10px] text-(--color-text-tertiary)">Created {new Date(t.created_at).toLocaleDateString()}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditTenant({ ...t }); setSettingsJson(JSON.stringify(t.settings, null, 2)); }}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-(--color-accent) hover:bg-(--color-accent-subtle) transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(t)}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-(--color-error) hover:bg-(--color-error-bg) transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <h3 className="font-display text-lg font-bold text-(--color-text) mb-4">New Tenant</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Name</label>
              <input type="text" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Slug</label>
              <input type="text" value={newTenant.slug} onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Plan</label>
              <Select
                value={newTenant.plan}
                onChange={(v) => setNewTenant({ ...newTenant, plan: v })}
                options={planOptions}
                fullWidth
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setCreating(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? "Creating..." : "Create"}</button>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editTenant && (
        <Modal onClose={() => setEditTenant(null)}>
          <h3 className="font-display text-lg font-bold text-(--color-text) mb-4">Edit Tenant</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Name</label>
              <input type="text" value={editTenant.name} onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) outline-none input-glow focus:border-(--color-accent)" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Plan</label>
              <Select
                value={editTenant.plan}
                onChange={(v) => setEditTenant({ ...editTenant, plan: v })}
                options={planOptions}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">Settings (JSON)</label>
              <textarea value={settingsJson} onChange={(e) => setSettingsJson(e.target.value)} rows={4}
                className="w-full px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-xs font-mono text-(--color-text) outline-none input-glow focus:border-(--color-accent) resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider">Active</label>
              <button
                onClick={() => setEditTenant({ ...editTenant, is_active: !editTenant.is_active })}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${editTenant.is_active ? "bg-emerald-500" : "bg-(--color-border)"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${editTenant.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditTenant(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h3 className="font-display text-lg font-bold text-(--color-text) mb-2">Delete Tenant</h3>
          <p className="text-sm text-(--color-text-secondary) mb-6">
            Are you sure you want to delete <span className="font-semibold text-(--color-text)">{confirmDelete.name}</span>? This action cannot be undone.
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
