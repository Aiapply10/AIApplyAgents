import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminStats, type AdminStats } from "../../lib/admin-api";

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  manager: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  member: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
};

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getAdminStats();
      if (res.error) setError(res.error);
      else setStats(res.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-up space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Admin Overview</h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">System dashboard</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-28 animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Admin Overview</h1>
        <div className="glass-card rounded-2xl p-8 mt-6 text-center">
          <p className="text-sm text-(--color-error)">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const tiles = [
    { label: "Total Users", value: stats.users_count, icon: UsersIcon, color: "bg-violet-500", colorBg: "bg-violet-100 dark:bg-violet-500/15" },
    { label: "Active Users", value: stats.active_users, icon: ActiveIcon, color: "bg-emerald-500", colorBg: "bg-emerald-100 dark:bg-emerald-500/15" },
    { label: "Tenants", value: stats.tenants_count, icon: BuildingIcon, color: "bg-sky-500", colorBg: "bg-sky-100 dark:bg-sky-500/15" },
    { label: "Signups (7d)", value: stats.recent_signups_count, icon: TrendIcon, color: "bg-amber-500", colorBg: "bg-amber-100 dark:bg-amber-500/15" },
  ];

  const roleEntries = Object.entries(stats.role_distribution);
  const totalRoleUsers = roleEntries.reduce((sum, [, c]) => sum + c, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Admin Overview</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">System dashboard and key metrics</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${t.colorBg} flex items-center justify-center shrink-0`}>
              <t.icon className={`w-5 h-5 ${t.color.replace("bg-", "text-")}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider">{t.label}</p>
              <p className="text-2xl font-bold text-(--color-text) mt-0.5 animate-count-in">{t.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role distribution */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-sm font-bold text-(--color-text) mb-4">Role Distribution</h2>
          <div className="space-y-3">
            {roleEntries.map(([role, count]) => {
              const pct = totalRoleUsers > 0 ? Math.round((count / totalRoleUsers) * 100) : 0;
              const barColor = role === "admin" ? "bg-red-500" : role === "manager" ? "bg-amber-500" : "bg-sky-500";
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-(--color-text-secondary) capitalize">{role}</span>
                    <span className="text-xs font-bold text-(--color-text)">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-(--color-surface-sunken) overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {roleEntries.length === 0 && (
              <p className="text-xs text-(--color-text-tertiary)">No users found</p>
            )}
          </div>
        </div>

        {/* Recent signups */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-(--color-text)">Recent Signups</h2>
            <Link to="/admin/users" className="text-xs font-semibold text-(--color-accent) hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {stats.recent_users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg row-hover">
                <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {u.display_name ? u.display_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-(--color-text) truncate">{u.display_name || u.email}</p>
                  <p className="text-[10px] text-(--color-text-tertiary) truncate">{u.email}</p>
                </div>
                <span className={`status-pill ${roleBadgeColors[u.role] || roleBadgeColors.member}`}>{u.role}</span>
              </div>
            ))}
            {stats.recent_users.length === 0 && (
              <p className="text-xs text-(--color-text-tertiary) text-center py-4">No users yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent audit events */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm font-bold text-(--color-text)">Recent Audit Events</h2>
          <Link to="/admin/audit" className="text-xs font-semibold text-(--color-accent) hover:underline">View all</Link>
        </div>
        {stats.recent_audit.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--color-border)">
                  <th className="text-left py-2 px-3 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Action</th>
                  <th className="text-left py-2 px-3 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Resource</th>
                  <th className="text-left py-2 px-3 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_audit.map((e) => (
                  <tr key={e.id} className="zebra-row row-hover">
                    <td className="py-2 px-3 font-medium text-(--color-text)">{e.action}</td>
                    <td className="py-2 px-3 text-(--color-text-secondary)">{e.resource_type}</td>
                    <td className="py-2 px-3 text-(--color-text-tertiary)">{new Date(e.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-(--color-text-tertiary) text-center py-6">No audit events yet</p>
        )}
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function ActiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}
