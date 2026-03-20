import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteResume, extractResumeFromFile, listResumes, tailorResume, getMasterSections, type Resume, type ResumeSection } from "../lib/resume-api";
import Toast from "../components/Toast";

// ── Derive suggested roles from master sections ──

function deriveSuggestedRoles(sections: ResumeSection[]): string[] {
  const roles = new Set<string>();

  // From header title
  const header = sections.find((s) => s.title === "Header");
  if (header?.entries?.[0]) {
    const title = String(header.entries[0].title || "");
    if (title && title.length > 2) roles.add(title);
  }

  // From experience roles
  const experience = sections.find((s) => s.title === "Experience");
  if (experience?.entries) {
    for (const entry of experience.entries) {
      const role = String(entry.role || entry.title || "");
      if (role && role.length > 2) roles.add(role);
    }
  }

  // Infer from skills
  const skills = sections.find((s) => s.title === "Skills");
  if (skills?.entries) {
    const allSkills = skills.entries
      .map((e) => String(e.skills || "").toLowerCase())
      .join(", ");

    const skillRoleMap: [string[], string][] = [
      [["react", "vue", "angular", "next.js", "tailwind", "css"], "Frontend Engineer"],
      [["node", "express", "fastapi", "django", "spring", "nest"], "Backend Engineer"],
      [["react", "node", "fullstack", "full-stack", "typescript"], "Full Stack Engineer"],
      [["python", "pytorch", "tensorflow", "ml", "machine learning", "nlp"], "Machine Learning Engineer"],
      [["aws", "gcp", "azure", "terraform", "kubernetes", "docker", "ci/cd"], "DevOps Engineer"],
      [["figma", "sketch", "ui/ux", "design system", "user research"], "Product Designer"],
      [["swift", "kotlin", "react native", "flutter", "ios", "android"], "Mobile Developer"],
      [["pandas", "sql", "tableau", "analytics", "data analysis", "etl"], "Data Analyst"],
      [["product", "roadmap", "stakeholder", "agile", "scrum"], "Product Manager"],
    ];

    for (const [keywords, role] of skillRoleMap) {
      const matchCount = keywords.filter((kw) => allSkills.includes(kw)).length;
      if (matchCount >= 2) roles.add(role);
    }
  }

  return [...roles].slice(0, 8);
}

// ── CreateActions ──

function CreateActions({
  className,
  onExtractStart,
  onExtractDone,
  onTailorClick,
}: {
  className?: string;
  onExtractStart?: () => void;
  onExtractDone?: (result: { id: string | null; error: string | null }) => void;
  onTailorClick?: () => void;
}) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    onExtractStart?.();
    const { data, error } = await extractResumeFromFile(file);
    if (error || !data) {
      onExtractDone?.({ id: null, error: error || "Extraction failed" });
    } else {
      onExtractDone?.({ id: data._id, error: null });
      navigate(`/resumes/${data._id}`);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => fileRef.current?.click()}
        title="Upload Resume (PDF/DOCX)"
        className="accent-gradient px-2.5 sm:px-4 py-2 rounded-lg text-[13px] font-bold text-white hover:opacity-90 shadow-sm transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <span className="hidden sm:inline">Upload Resume</span>
      </button>
      <button
        onClick={onTailorClick}
        title="Tailor Resume from Master Profile"
        className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer px-2.5 sm:px-4 py-2 inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
        </svg>
        <span className="hidden sm:inline">Tailor</span>
      </button>
      <button
        onClick={() => navigate("/resumes/new")}
        title="New Resume"
        className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer px-2.5 sm:px-4 py-2 inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className="hidden sm:inline">New Resume</span>
      </button>
    </div>
  );
}

// ── Main Component ──

export default function Resumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Tailor state
  const [tailorOpen, setTailorOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [tailorJd, setTailorJd] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailorProgress, setTailorProgress] = useState({ current: 0, total: 0 });
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    const { data } = await listResumes();
    setResumes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  async function handleDelete(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"?`)) return;
    const { error } = await deleteResume(id);
    if (error) {
      setToast({ message: error, type: "error" });
    } else {
      setResumes((prev) => prev.filter((r) => r._id !== id));
    }
  }

  async function openTailorModal() {
    setTailorOpen(true);
    setSelectedRoles([]);
    setCustomRole("");
    setTailorJd("");
    setSuggestionsLoading(true);

    const res = await getMasterSections();
    if (res.data?.sections?.length) {
      setSuggestedRoles(deriveSuggestedRoles(res.data.sections));
    } else {
      setSuggestedRoles([]);
    }
    setSuggestionsLoading(false);
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function addCustomRole() {
    const role = customRole.trim();
    if (role && !selectedRoles.includes(role)) {
      setSelectedRoles((prev) => [...prev, role]);
    }
    setCustomRole("");
  }

  async function handleTailor() {
    if (selectedRoles.length === 0) return;
    setTailoring(true);
    setTailorProgress({ current: 0, total: selectedRoles.length });

    const createdIds: string[] = [];
    const jd = tailorJd.trim();

    for (let i = 0; i < selectedRoles.length; i++) {
      setTailorProgress({ current: i + 1, total: selectedRoles.length });
      const res = await tailorResume({
        target_role: selectedRoles[i],
        job_description: jd,
      });
      if (res.error) {
        setToast({ message: `Failed for "${selectedRoles[i]}": ${res.error}`, type: "error" });
      } else if (res.data) {
        createdIds.push(res.data._id);
      }
    }

    setTailoring(false);
    setTailorOpen(false);
    setSelectedRoles([]);
    setTailorJd("");

    if (createdIds.length === 1) {
      navigate(`/resumes/${createdIds[0]}`);
    } else if (createdIds.length > 1) {
      setToast({ message: `${createdIds.length} resumes created`, type: "success" });
      fetchResumes();
    }
  }

  const extractHandlers = {
    onExtractStart: () => setExtracting(true),
    onExtractDone: ({ error }: { id: string | null; error: string | null }) => {
      setExtracting(false);
      if (error) setToast({ message: error, type: "error" });
    },
    onTailorClick: openTailorModal,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* Extracting overlay */}
      {extracting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-4 animate-fade-up" style={{ animationDuration: "0.2s" }}>
            <div className="w-10 h-10 border-3 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
            <div className="text-center">
              <p className="text-sm font-semibold text-(--color-text)">Extracting resume...</p>
              <p className="text-xs text-(--color-text-tertiary) mt-1">AI is analyzing your document</p>
            </div>
          </div>
        </div>
      )}

      {resumes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-(--color-surface-sunken) to-(--color-surface) flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-6 h-6 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-(--color-text-secondary) mb-1">No resumes yet</p>
          <p className="text-xs text-(--color-text-tertiary) mb-6">Create your first resume to get started</p>
          <CreateActions {...extractHandlers} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-8 animate-fade-up">
            <div className="min-w-0">
              <p className="text-[13px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">Builder</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) tracking-tight">Resume Gallery</h1>
            </div>
            <CreateActions className="shrink-0" {...extractHandlers} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {resumes.map((r) => {
              const visibleSections = r.sections.filter((s) => s.visible !== false);
              const sectionNames = visibleSections.map((s) => s.title);
              return (
                <div
                  key={r._id}
                  onClick={() => navigate(`/resumes/${r._id}`)}
                  className="glass-card rounded-2xl p-5 cursor-pointer group hover:border-(--color-accent)/30 transition-all duration-200 relative"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0 shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-(--color-text) group-hover:text-(--color-accent) transition-colors truncate">{r.title}</p>
                      {r.target_role ? (
                        <p className="text-[11px] text-(--color-text-tertiary) truncate mt-0.5">{r.target_role}</p>
                      ) : (
                        <p className="text-[11px] text-(--color-text-tertiary) italic mt-0.5">No target role</p>
                      )}
                    </div>
                  </div>
                  {sectionNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {sectionNames.slice(0, 5).map((name) => (
                        <span key={name} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-(--color-surface-sunken) text-(--color-text-tertiary)">{name}</span>
                      ))}
                      {sectionNames.length > 5 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-(--color-surface-sunken) text-(--color-text-tertiary)">+{sectionNames.length - 5}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-(--color-text-tertiary) italic mb-3">Empty — no sections yet</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-(--color-text-tertiary)">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
                      {r.sections.length} section{r.sections.length !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                      {new Date(r.updated_at).toLocaleDateString()}
                    </span>
                    {r.is_default && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-(--color-accent-subtle) text-(--color-accent)">Default</span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/resumes/analyze?id=${r._id}`); }} title="Analyze" className="p-1.5 rounded-lg text-(--color-text-tertiary) hover:text-(--color-accent) hover:bg-(--color-accent-subtle) transition-all duration-200 cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    </button>
                    <button onClick={(e) => handleDelete(e, r._id, r.title)} title="Delete" className="p-1.5 rounded-lg text-(--color-text-tertiary) hover:text-(--color-error) hover:bg-(--color-error-bg) transition-all duration-200 cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Tailor modal */}
      {tailorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !tailoring && setTailorOpen(false)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg animate-fade-up" style={{ animationDuration: "0.2s" }}>
            {tailoring ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-10 h-10 border-3 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-(--color-text)">
                    Tailoring {tailorProgress.current} of {tailorProgress.total}...
                  </p>
                  <p className="text-xs text-(--color-text-tertiary) mt-1">
                    {selectedRoles[tailorProgress.current - 1] || ""}
                  </p>
                  {tailorProgress.total > 1 && (
                    <div className="w-48 h-1.5 rounded-full bg-(--color-surface-sunken) mt-3 mx-auto overflow-hidden">
                      <div
                        className="h-full rounded-full accent-gradient transition-all duration-500"
                        style={{ width: `${(tailorProgress.current / tailorProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-(--color-text) mb-1">Tailor Resumes</h3>
                <p className="text-xs text-(--color-text-tertiary) mb-5">
                  Select target roles — AI will create a tailored resume for each from your master profile.
                </p>
                <div className="space-y-4">
                  {/* Suggested roles */}
                  <div>
                    <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-2">
                      Suggested Roles
                    </label>
                    {suggestionsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-4 h-4 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
                        <span className="text-xs text-(--color-text-tertiary)">Analyzing your profile...</span>
                      </div>
                    ) : suggestedRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {suggestedRoles.map((role) => {
                          const isSelected = selectedRoles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => toggleRole(role)}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer border ${
                                isSelected
                                  ? "bg-(--color-accent) text-white border-(--color-accent) shadow-sm"
                                  : "bg-(--color-surface-sunken) text-(--color-text-secondary) border-(--color-border) hover:border-(--color-accent) hover:text-(--color-accent)"
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                              {role}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-(--color-text-tertiary) py-1">
                        No suggestions — fill your master profile for AI-powered suggestions.
                      </p>
                    )}
                  </div>

                  {/* Custom role input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">
                      Add Custom Role
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomRole(); } }}
                        placeholder="e.g. Senior Frontend Engineer"
                        className="flex-1 px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) placeholder:text-(--color-text-tertiary) outline-none input-glow focus:border-(--color-accent)"
                      />
                      <button
                        type="button"
                        onClick={addCustomRole}
                        disabled={!customRole.trim()}
                        className="px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Selected roles */}
                  {selectedRoles.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-2">
                        Selected ({selectedRoles.length})
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRoles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-(--color-accent-subtle) text-(--color-accent)"
                          >
                            {role}
                            <button
                              type="button"
                              onClick={() => toggleRole(role)}
                              className="hover:opacity-60 cursor-pointer"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-1.5">
                      Job Description (optional — applies to all)
                    </label>
                    <textarea
                      value={tailorJd}
                      onChange={(e) => setTailorJd(e.target.value)}
                      placeholder="Paste a job description for better targeting..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm text-(--color-text) placeholder:text-(--color-text-tertiary) outline-none input-glow focus:border-(--color-accent) resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button onClick={() => setTailorOpen(false)} className="btn-secondary">Cancel</button>
                  <button
                    onClick={handleTailor}
                    disabled={selectedRoles.length === 0}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {selectedRoles.length <= 1
                      ? "Generate Tailored Resume"
                      : `Generate ${selectedRoles.length} Resumes`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
