import { useCallback, useEffect, useState } from "react";
import { listAuditEvents, type AuditEvent } from "../../lib/admin-api";
import Select from "../../components/Select";

export default function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await listAuditEvents({
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      resource_type: resourceTypeFilter || undefined,
      actor_id: actorFilter || undefined,
    });
    if (res.error) setError(res.error);
    else setEvents(res.data || []);
    setLoading(false);
  }, [page, resourceTypeFilter, actorFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const resourceTypes = [...new Set(events.map((e) => e.resource_type))].sort();
  const resourceTypeOptions = [
    { value: "", label: "All Resources" },
    ...resourceTypes.map((rt) => ({ value: rt, label: rt })),
  ];

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Audit Log</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">System activity trail</p>
      </div>

      {/* Filter bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <Select
          value={resourceTypeFilter}
          onChange={(v) => { setResourceTypeFilter(v); setPage(0); }}
          options={resourceTypeOptions}
        />
        <input
          type="text"
          placeholder="Filter by actor ID..."
          value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); setPage(0); }}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) placeholder:text-(--color-text-tertiary) outline-none input-glow focus:border-(--color-accent)"
        />
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
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-(--color-text-tertiary)">No audit events found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--color-border)">
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Actor</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Resource</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Resource ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-(--color-text-tertiary) uppercase tracking-wider text-[10px]">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="zebra-row row-hover border-b border-(--color-border-subtle) last:border-0">
                    <td className="py-2.5 px-4 text-(--color-text-tertiary) whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-(--color-text-secondary) font-mono text-[10px]">{e.actor_id ? e.actor_id.slice(0, 12) + "..." : "—"}</td>
                    <td className="py-2.5 px-4 font-semibold text-(--color-text)">{e.action}</td>
                    <td className="py-2.5 px-4">
                      <span className="status-pill bg-(--color-accent-subtle) text-(--color-accent)">{e.resource_type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-(--color-text-tertiary) font-mono text-[10px]">{e.resource_id.slice(0, 12)}...</td>
                    <td className="py-2.5 px-4">
                      {Object.keys(e.detail).length > 0 ? (
                        <button
                          onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                          className="text-[11px] font-semibold text-(--color-accent) hover:underline cursor-pointer"
                        >
                          {expandedId === e.id ? "Hide" : "View"}
                        </button>
                      ) : (
                        <span className="text-(--color-text-tertiary)">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Expanded detail */}
            {expandedId && (() => {
              const ev = events.find((e) => e.id === expandedId);
              if (!ev) return null;
              return (
                <div className="px-4 py-3 border-t border-(--color-border) bg-(--color-surface-sunken)">
                  <pre className="text-[10px] font-mono text-(--color-text-secondary) whitespace-pre-wrap">
                    {JSON.stringify(ev.detail, null, 2)}
                  </pre>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && events.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-(--color-text-tertiary)">Page {page + 1}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={events.length < PAGE_SIZE}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
