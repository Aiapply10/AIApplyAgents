import { useNavigate } from "react-router-dom";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { deleteProfile } from "../lib/api";
import { useProfile } from "../hooks/useProfile";
import ProfileCompleteness from "../components/ProfileCompleteness";

const isDev = import.meta.env.DEV;

export default function Dashboard() {
  const navigate = useNavigate();
  const session = useSessionContext();
  const { refresh } = useProfile();
  const userId = !session.loading && session.doesSessionExist ? session.userId : "";

  return (
    <>
      <ProfileCompleteness />

      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-[28px] font-bold text-(--color-text) leading-[1.2] tracking-tight">
          Mission Control
        </h1>
        <p className="text-[13px] text-(--color-text-secondary) mt-1">
          Job automation pipeline overview
        </p>
      </div>

      {/* Stat tiles — 4 column, mono numbers, delta badges */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up"
        style={{ animationDelay: "0.05s" }}
      >
        {[
          { label: "Applications", value: "0", icon: "M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5", iconBg: "bg-violet-100 dark:bg-violet-500/15", iconColor: "text-violet-600 dark:text-violet-400", tint: "card-violet" },
          { label: "Matches", value: "0", icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", iconBg: "bg-emerald-100 dark:bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", tint: "card-emerald" },
          { label: "Active Runs", value: "0", icon: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z", iconBg: "bg-amber-100 dark:bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400", tint: "card-amber" },
          { label: "Sources", value: "0", icon: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244", iconBg: "bg-sky-100 dark:bg-sky-500/15", iconColor: "text-sky-600 dark:text-sky-400", tint: "card-sky" },
        ].map((stat) => (
          <div key={stat.label} className={`glass-card ${stat.tint} rounded-lg p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center shrink-0`}>
                <svg className={`w-4.5 h-4.5 ${stat.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-(--color-text-secondary) uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="font-mono text-[28px] font-bold text-(--color-text) leading-[1] animate-count-in">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main grid — Activity + Actions */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Recent Activity — takes 2 cols */}
        <div className="lg:col-span-2 glass-card rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
            <h2 className="font-display text-[15px] font-bold text-(--color-text)">
              Recent Activity
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-(--color-text-tertiary) uppercase tracking-widest font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-success) animate-pulse-glow" />
              Live
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_100px_80px] px-5 py-2 text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider border-b border-(--color-border-subtle)">
            <span>Event</span>
            <span>Target</span>
            <span>Status</span>
            <span className="text-right">Time</span>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-lg bg-(--color-surface-sunken) flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-(--color-text-secondary)">
              No activity yet
            </p>
            <p className="text-[11px] text-(--color-text-tertiary) mt-1 max-w-[220px]">
              Start a workflow to see application events stream here
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="glass-card rounded-lg">
          <div className="px-5 py-4 border-b border-(--color-border)">
            <h2 className="font-display text-[15px] font-bold text-(--color-text)">
              Quick Actions
            </h2>
          </div>

          <div className="p-2">
            {[
              {
                label: "New Workflow",
                desc: "Fetch, match & apply",
                onClick: () => {},
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />,
              },
              {
                label: "Job Sources",
                desc: "Configure boards & feeds",
                onClick: () => navigate("/sources"),
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />,
              },
              {
                label: "Resumes",
                desc: "Build & analyze resumes",
                onClick: () => navigate("/resumes"),
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
              },
              {
                label: "My Profile",
                desc: "Contact & preferences",
                onClick: () => navigate("/profile"),
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />,
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-100 group cursor-pointer hover:bg-(--color-surface-sunken)"
              >
                <div className="w-8 h-8 rounded-lg bg-(--color-surface-sunken) group-hover:bg-(--color-accent-subtle) flex items-center justify-center shrink-0 transition-colors duration-100">
                  <svg className="w-4 h-4 text-(--color-text-tertiary) group-hover:text-(--color-accent) transition-colors duration-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    {action.icon}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-(--color-text) group-hover:text-(--color-accent) transition-colors duration-100">
                    {action.label}
                  </p>
                  <p className="text-[11px] text-(--color-text-tertiary) truncate">
                    {action.desc}
                  </p>
                </div>
                <svg className="w-4 h-4 text-(--color-text-tertiary) opacity-0 group-hover:opacity-100 transition-all duration-100 -translate-x-1 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline status row */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 animate-fade-up"
        style={{ animationDelay: "0.15s" }}
      >
        {[
          { stage: "Fetching", desc: "Job sources polling", status: "idle", dotColor: "bg-sky-400", tint: "border-l-sky-400" },
          { stage: "Matching", desc: "Skills alignment engine", status: "idle", dotColor: "bg-violet-400", tint: "border-l-violet-400" },
          { stage: "Applying", desc: "Browser automation", status: "idle", dotColor: "bg-emerald-400", tint: "border-l-emerald-400" },
        ].map((pipe) => (
          <div key={pipe.stage} className={`glass-card rounded-lg px-4 py-3 flex items-center gap-3 border-l-[3px] ${pipe.tint}`}>
            <div className={`w-2 h-2 rounded-full ${pipe.dotColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-(--color-text)">{pipe.stage}</p>
              <p className="text-[11px] text-(--color-text-tertiary) truncate">{pipe.desc}</p>
            </div>
            <span className="status-pill bg-(--color-surface-sunken) text-(--color-text-tertiary)">
              {pipe.status}
            </span>
          </div>
        ))}
      </div>

      {/* Dev-only: reset profile to re-trigger onboarding */}
      {isDev && (
        <div className="mt-12 pt-6 border-t border-dashed border-(--color-border)">
          <button
            onClick={async () => {
              if (!userId || !confirm("Reset your profile? This will delete your profile and redirect to onboarding.")) return;
              await deleteProfile(userId);
              await refresh();
              navigate("/onboarding");
            }}
            className="px-4 py-2 rounded-lg border border-dashed border-(--color-error)/40 text-[12px] font-mono text-(--color-error) hover:bg-(--color-error-bg) transition-colors cursor-pointer"
          >
            [DEV] Reset Profile & Onboarding
          </button>
        </div>
      )}
    </>
  );
}
