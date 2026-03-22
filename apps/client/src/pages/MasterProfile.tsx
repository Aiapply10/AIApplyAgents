import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMasterSections,
  updateMasterSections,
  listResumes,
  importToMasterSections,
  extractResumeFromFile,
  type Resume,
  type ResumeSection,
} from "../lib/resume-api";
import {
  SECTION_DEFS,
  ensureAllSections,
  sectionHasContent,
} from "../components/ResumeSectionEditor";
import ResumeSectionEditor from "../components/ResumeSectionEditor";
import Toast from "../components/Toast";

export default function MasterProfile() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("Header");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"resume" | "file" | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getMasterSections();
    if (res.data) {
      const s = ensureAllSections(res.data.sections || []);
      setSections(s);
      lastSaved.current = JSON.stringify(s);
    } else {
      const s = ensureAllSections([]);
      setSections(s);
      lastSaved.current = JSON.stringify(s);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-save with debounce
  function handleSectionsChange(newSections: ResumeSection[]) {
    setSections(newSections);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const snap = JSON.stringify(newSections);
      if (snap !== lastSaved.current) {
        doSave(newSections);
      }
    }, 1200);
  }

  async function doSave(s: ResumeSection[]) {
    setSaving(true);
    const res = await updateMasterSections(s);
    if (res.error) {
      setToast({ message: res.error, type: "error" });
    } else {
      lastSaved.current = JSON.stringify(s);
    }
    setSaving(false);
  }

  function updateSection(updated: ResumeSection) {
    handleSectionsChange(sections.map((s) => (s.id === updated.id ? updated : s)));
  }

  // Import from existing resume
  async function openImportResume() {
    setImportMode("resume");
    setResumesLoading(true);
    const res = await listResumes();
    setResumes(res.data || []);
    setResumesLoading(false);
  }

  async function handleImportFromResume(resumeId: string) {
    setImporting(true);
    const res = await importToMasterSections(resumeId);
    setImporting(false);
    if (res.error) {
      setToast({ message: res.error, type: "error" });
    } else {
      setToast({ message: "Imported successfully", type: "success" });
      setImportOpen(false);
      setImportMode(null);
      refresh();
    }
  }

  // Import from file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImporting(true);
    // First extract the file into a resume
    const extractRes = await extractResumeFromFile(file);
    if (extractRes.error || !extractRes.data) {
      setImporting(false);
      setToast({ message: extractRes.error || "Extraction failed", type: "error" });
      return;
    }
    // Then import that resume's sections into master
    const importRes = await importToMasterSections(extractRes.data.id);
    setImporting(false);
    if (importRes.error) {
      setToast({ message: importRes.error, type: "error" });
    } else {
      setToast({ message: "Imported from file successfully", type: "success" });
      setImportOpen(false);
      setImportMode(null);
      refresh();
    }
  }

  const current = sections.find((s) => s.title === activeSection);
  const filledCount = sections.filter(sectionHasContent).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} />

      <div className="animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[13px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">Career Data</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) tracking-tight">
              Master Profile
            </h1>
            <p className="text-sm text-(--color-text-secondary) mt-1">
              Your complete career data — {filledCount} of {SECTION_DEFS.length} sections filled
              {saving && <span className="ml-2 text-(--color-text-tertiary)">Saving...</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer px-3 sm:px-4 py-2 inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => navigate("/resumes/new")}
              className="accent-gradient px-3 sm:px-4 py-2 rounded-lg text-[13px] font-bold text-white hover:opacity-90 shadow-sm transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">New Resume</span>
            </button>
          </div>
        </div>

        {/* Section tabs + editor */}
        <div className="flex gap-6">
          {/* Section nav (desktop) */}
          <div className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-24 space-y-0.5">
              {SECTION_DEFS.map((def) => {
                const sec = sections.find((s) => s.title === def.label);
                const filled = sec ? sectionHasContent(sec) : false;
                const isActive = activeSection === def.label;
                return (
                  <button
                    key={def.key}
                    onClick={() => setActiveSection(def.label)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? "bg-(--color-accent-subtle) text-(--color-accent)"
                        : "text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken)"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filled ? "bg-(--color-accent)" : "bg-(--color-border)"}`} />
                    {def.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="lg:hidden w-full">
            <div className="flex gap-1 overflow-x-auto pb-3 mb-4 -mx-2 px-2">
              {SECTION_DEFS.map((def) => {
                const sec = sections.find((s) => s.title === def.label);
                const filled = sec ? sectionHasContent(sec) : false;
                const isActive = activeSection === def.label;
                return (
                  <button
                    key={def.key}
                    onClick={() => setActiveSection(def.label)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-(--color-accent-subtle) text-(--color-accent)"
                        : "bg-(--color-surface-sunken) text-(--color-text-tertiary) hover:text-(--color-text)"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${filled ? "bg-(--color-accent)" : "bg-(--color-border)"}`} />
                    {def.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 min-w-0">
            {current && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-(--color-text)">{current.title}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    sectionHasContent(current)
                      ? "bg-(--color-success-bg) text-(--color-success)"
                      : "bg-(--color-surface-sunken) text-(--color-text-tertiary)"
                  }`}>
                    {sectionHasContent(current) ? "Has data" : "Empty"}
                  </span>
                </div>
                <ResumeSectionEditor
                  sectionKey={SECTION_DEFS.find((d) => d.label === current.title)?.key ?? "header"}
                  section={current}
                  onChange={updateSection}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !importing && (setImportOpen(false), setImportMode(null))} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md animate-fade-up" style={{ animationDuration: "0.2s" }}>
            {importing ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-10 h-10 border-3 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-(--color-text)">Importing...</p>
                  <p className="text-xs text-(--color-text-tertiary) mt-1">
                    {importMode === "file" ? "Extracting and importing from file" : "Copying sections from resume"}
                  </p>
                </div>
              </div>
            ) : !importMode ? (
              <>
                <h3 className="font-display text-lg font-bold text-(--color-text) mb-1">Import Career Data</h3>
                <p className="text-xs text-(--color-text-tertiary) mb-5">
                  Fill your master profile from an existing source. Sections with existing data will be preserved.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={openImportResume}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-(--color-border) hover:border-(--color-accent) hover:bg-(--color-accent-subtle) transition-all duration-150 cursor-pointer text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-(--color-surface-sunken) group-hover:bg-(--color-accent-subtle) flex items-center justify-center shrink-0 transition-colors">
                      <svg className="w-5 h-5 text-(--color-text-tertiary) group-hover:text-(--color-accent) transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--color-text)">From Existing Resume</p>
                      <p className="text-[11px] text-(--color-text-tertiary)">Pick a resume you've already created</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setImportMode("file"); setTimeout(() => fileRef.current?.click(), 100); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-(--color-border) hover:border-(--color-accent) hover:bg-(--color-accent-subtle) transition-all duration-150 cursor-pointer text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-(--color-surface-sunken) group-hover:bg-(--color-accent-subtle) flex items-center justify-center shrink-0 transition-colors">
                      <svg className="w-5 h-5 text-(--color-text-tertiary) group-hover:text-(--color-accent) transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--color-text)">Upload File</p>
                      <p className="text-[11px] text-(--color-text-tertiary)">Upload a PDF or DOCX resume file</p>
                    </div>
                  </button>
                </div>
                <div className="flex justify-end mt-5">
                  <button onClick={() => setImportOpen(false)} className="btn-secondary">Cancel</button>
                </div>
              </>
            ) : importMode === "resume" ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setImportMode(null)} className="p-1 rounded-lg hover:bg-(--color-surface-sunken) transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <h3 className="font-display text-lg font-bold text-(--color-text)">Select a Resume</h3>
                </div>
                {resumesLoading ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-(--color-text-tertiary)">No resumes found. Create or upload one first.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {resumes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleImportFromResume(r.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-(--color-surface-sunken) transition-all duration-150 cursor-pointer text-left"
                      >
                        <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-(--color-text) truncate">{r.title}</p>
                          <p className="text-[11px] text-(--color-text-tertiary) truncate">
                            {r.target_role || "No target role"} — {r.sections.length} sections
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* file mode - just waiting for file dialog, close on cancel */
              <div className="py-8 text-center">
                <p className="text-sm text-(--color-text-tertiary)">Select a PDF or DOCX file...</p>
                <button onClick={() => { setImportMode(null); }} className="btn-secondary mt-4">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
