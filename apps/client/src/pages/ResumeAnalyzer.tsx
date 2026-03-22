import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  listResumes,
  analyzeResume,
  type Resume,
  type AnalysisResult,
} from "../lib/resume-api";
import Select from "../components/Select";

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400 ring-1 ring-red-500/20",
  medium: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-500/20",
  low: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-blue-500/20",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-green-500",
  A: "text-green-500",
  B: "text-emerald-500",
  C: "text-amber-500",
  D: "text-orange-500",
};

const GRADE_RING: Record<string, string> = {
  "A+": "stroke-green-500",
  A: "stroke-green-500",
  B: "stroke-emerald-500",
  C: "stroke-amber-500",
  D: "stroke-orange-500",
};

function barColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function ResumeAnalyzer() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("id") || "";
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedId, setSelectedId] = useState(preselectedId);
  const [targetRole, setTargetRole] = useState("");
  const autoTriggered = useRef(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const resumeOptions = useMemo(
    () => resumes.map((r) => ({
      value: r.id ?? "",
      label: `${r.title}${r.target_role ? ` — ${r.target_role}` : ""}`,
    })),
    [resumes],
  );

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    const { data } = await listResumes();
    setResumes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  useEffect(() => {
    if (resumes.length === 0) return;
    if (!selectedId) {
      setSelectedId(resumes[0].id);
      if (resumes[0].target_role) setTargetRole(resumes[0].target_role);
    } else {
      const r = resumes.find((r) => r.id === selectedId);
      if (r?.target_role && !targetRole) setTargetRole(r.target_role);
      if (preselectedId && !autoTriggered.current) {
        autoTriggered.current = true;
        handleAnalyze();
      }
    }
  }, [resumes, selectedId]);

  function handleSelectResume(id: string) {
    setSelectedId(id);
    setResult(null);
    const r = resumes.find((r) => r.id === id);
    if (r?.target_role) setTargetRole(r.target_role);
  }

  async function handleAnalyze() {
    if (!selectedId) return;
    setAnalyzing(true);
    setError("");
    setResult(null);
    const { data, error: err } = await analyzeResume(selectedId, targetRole);
    if (err) setError(err);
    else setResult(data);
    setAnalyzing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-(--color-surface-sunken) to-(--color-surface) border border-(--color-border) flex items-center justify-center mb-4 shadow-sm">
          <svg className="w-6 h-6 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-(--color-text-secondary) mb-1">No resumes to analyze</p>
        <p className="text-xs text-(--color-text-tertiary) mb-4">Create a resume first, then come back to analyze it.</p>
        <Link to="/resumes/new" className="text-sm font-semibold text-(--color-accent) hover:underline">Create a Resume</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <p className="text-[13px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">Builder</p>
        <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">Resume Analyzer</h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">Weighted scoring across 8 categories — tailored to your target role</p>
      </div>

      {/* Controls */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-(--color-text-secondary) mb-1.5">Resume</label>
            <Select
              value={selectedId}
              onChange={handleSelectResume}
              options={resumeOptions}
              fullWidth
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-(--color-text-secondary) mb-1.5">Target Role</label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Frontend Engineer, Data Scientist..."
              className="w-full px-3 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-accent)/30 placeholder:text-(--color-text-tertiary) transition-all"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedId}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white accent-gradient shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card rounded-2xl p-4 mb-6 border-red-200 dark:border-red-900/50 bg-(--color-error-bg)">
          <p className="text-sm text-(--color-error)">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {/* Score + Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score ring */}
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
              <svg className="w-40 h-40 mb-4" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" strokeWidth="8" className="stroke-(--color-surface-sunken)" />
                <circle
                  cx="80" cy="80" r="68" fill="none" strokeWidth="8" strokeLinecap="round"
                  className={GRADE_RING[result.grade] || "stroke-(--color-accent)"}
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68 - (result.score / 100) * 2 * Math.PI * 68}
                  transform="rotate(-90 80 80)"
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
                <text x="80" y="80" textAnchor="middle" dominantBaseline="central"
                  fontSize="36" fontWeight="bold"
                  className={GRADE_COLORS[result.grade] || "text-(--color-accent)"}
                  fill="currentColor"
                >
                  {result.score}%
                </text>
              </svg>
              <span className={`text-3xl font-bold font-display ${GRADE_COLORS[result.grade]}`}>{result.grade}</span>
              <p className="text-xs text-(--color-text-tertiary) mt-1">{result.interpretation}</p>
              {result.target_role && (
                <p className="text-[11px] text-(--color-text-tertiary) mt-2">
                  vs. <span className="font-semibold text-(--color-accent)">{result.target_role}</span>
                </p>
              )}
            </div>

            {/* Category breakdown */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-(--color-text) mb-5">Score Breakdown</h3>
              <div className="space-y-4">
                {result.categories.map((cat) => {
                  const pct = Math.round((cat.score / cat.max) * 100);
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-(--color-text)">{cat.name}</span>
                        <span className="text-sm font-bold text-(--color-text) tabular-nums">
                          {cat.score}<span className="text-(--color-text-tertiary) font-normal">/{cat.max}</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-(--color-surface-sunken) overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-(--color-text-tertiary) mt-1">{cat.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Sections", value: result.summary.sections_found },
              { label: "Skills", value: result.summary.total_skills },
              { label: "Roles", value: result.summary.experience_entries },
              { label: "Bullets", value: result.summary.bullet_points },
              { label: "Quantified", value: result.summary.quantified_bullets },
              { label: "Strong Verbs", value: result.summary.strong_verbs },
              { label: "Weak Verbs", value: result.summary.weak_verbs },
              { label: "Words", value: result.summary.word_count },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-(--color-text) font-display">{s.value}</p>
                <p className="text-[10px] text-(--color-text-tertiary) mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-(--color-error)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <h3 className="text-sm font-semibold text-(--color-text)">
                  Issues <span className="text-(--color-text-tertiary) font-normal">({result.issues.length})</span>
                </h3>
              </div>
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-(--color-surface-sunken)">
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-(--color-text-secondary)">{issue.section}</span>
                      <p className="text-sm text-(--color-text) mt-0.5">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-(--color-accent)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                <h3 className="text-sm font-semibold text-(--color-text)">
                  Suggestions <span className="text-(--color-text-tertiary) font-normal">({result.suggestions.length})</span>
                </h3>
              </div>
              <div className="space-y-2">
                {result.suggestions.map((sug, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-(--color-surface-sunken)">
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                      tip
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-(--color-text-secondary)">{sug.section}</span>
                      <p className="text-sm text-(--color-text) mt-0.5">{sug.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing keywords */}
          {result.missing_keywords.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-(--color-warning)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                <h3 className="text-sm font-semibold text-(--color-text)">Missing Keywords for "{result.target_role}"</h3>
              </div>
              <p className="text-xs text-(--color-text-tertiary) mb-3">Adding these to your Skills or Experience will improve your match rate:</p>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((kw) => (
                  <span key={kw} className="px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed border-(--color-warning) text-(--color-warning) bg-(--color-warning-bg)">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All clear */}
          {result.issues.length === 0 && result.suggestions.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-(--color-success-bg) flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-(--color-success)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-(--color-text)">Looking great!</p>
              <p className="text-xs text-(--color-text-tertiary) mt-1">No issues found. Your resume is well-optimized.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
