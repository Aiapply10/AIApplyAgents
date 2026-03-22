import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createResume,
  getResume,
  updateResume,
  type Resume,
  type ResumeSection as SectionType,
} from "../lib/resume-api";
import { useProfile } from "../hooks/useProfile";
import ResumeSectionEditor, {
  SECTION_DEFS,
  ensureAllSections,
  sectionHasContent,
  type SectionKey,
} from "../components/ResumeSectionEditor";
import Toast from "../components/Toast";

function genId() {
  return crypto.randomUUID();
}

/** Map a section label back to its key. */
function labelToKey(label: string): SectionKey | undefined {
  return SECTION_DEFS.find((d) => d.label === label)?.key;
}

/** Build a draft resume pre-filled from the user's profile. */
function buildDraftFromProfile(profile: {
  full_name: string;
  headline: string;
  summary: string;
  location: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  skills: string[];
  experience: Record<string, unknown>[];
  education: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
}): Resume {
  const sections: SectionType[] = [];
  let order = 0;

  // Header
  sections.push({
    id: genId(),
    title: "Header",
    type: "entries",
    content: "",
    items: [],
    entries: [
      {
        full_name: profile.full_name,
        title: profile.headline,
        location: profile.location,
        phone: profile.phone,
        email: "",
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        portfolio_url: profile.portfolio_url,
        _selected: true,
      },
    ],
    visible: true,
    order: order++,
  });

  // Summary
  const summarySection: SectionType = {
    id: genId(),
    title: "Summary",
    type: "text",
    content: profile.summary,
    items: [],
    entries: [],
    visible: true,
    order: order++,
  };
  summarySection.visible = sectionHasContent(summarySection);
  sections.push(summarySection);

  // Skills
  const skillsSection: SectionType = {
    id: genId(),
    title: "Skills",
    type: "entries",
    content: "",
    items: [],
    entries:
      profile.skills.length > 0
        ? [{ category: "Core Skills", skills: profile.skills.join(", "), _selected: true }]
        : [],
    visible: true,
    order: order++,
  };
  skillsSection.visible = sectionHasContent(skillsSection);
  sections.push(skillsSection);

  // Experience — map old field names
  const expSection: SectionType = {
    id: genId(),
    title: "Experience",
    type: "entries",
    content: "",
    items: [],
    entries: profile.experience.map((e) => ({
      company: e.organization ?? e.company ?? "",
      role: e.title ?? e.role ?? "",
      start_date: e.start_date ?? "",
      end_date: e.end_date ?? "",
      description: e.description ?? "",
      _selected: true,
    })),
    visible: true,
    order: order++,
  };
  expSection.visible = sectionHasContent(expSection);
  sections.push(expSection);

  // Projects (empty)
  const projSection: SectionType = {
    id: genId(),
    title: "Projects",
    type: "entries",
    content: "",
    items: [],
    entries: [],
    visible: true,
    order: order++,
  };
  projSection.visible = sectionHasContent(projSection);
  sections.push(projSection);

  // Education — map old field names
  const eduSection: SectionType = {
    id: genId(),
    title: "Education",
    type: "entries",
    content: "",
    items: [],
    entries: profile.education.map((e) => ({
      degree: e.title ?? e.degree ?? "",
      institution: e.organization ?? e.institution ?? "",
      year: e.year ?? "",
      coursework: e.coursework ?? "",
      _selected: true,
    })),
    visible: true,
    order: order++,
  };
  eduSection.visible = sectionHasContent(eduSection);
  sections.push(eduSection);

  // Certifications — map old field names
  const certSection: SectionType = {
    id: genId(),
    title: "Certifications",
    type: "entries",
    content: "",
    items: [],
    entries: profile.certifications.map((e) => ({
      name: e.title ?? e.name ?? "",
      issuer: e.organization ?? e.issuer ?? "",
      year: e.year ?? "",
      _selected: true,
    })),
    visible: true,
    order: order++,
  };
  certSection.visible = sectionHasContent(certSection);
  sections.push(certSection);

  // Remaining sections added by ensureAllSections
  return {
    id: "",
    title: "Untitled",
    target_role: "",
    sections: ensureAllSections(sections),
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const SECTION_PROMPT = (
  title: string,
  targetRole: string,
  summary: string,
  skills: string[],
) => `I'm writing the "${title}" section of my resume.
${targetRole ? `Target role: ${targetRole}` : ""}
${summary ? `My background: ${summary}` : ""}
${skills.length > 0 ? `My skills: ${skills.join(", ")}` : ""}

Write a compelling "${title}" section for my resume. Be specific and quantify achievements where possible. Respond with just the content, no markdown headings or extra formatting.`;

/** Snapshot the resume state for dirty comparison. */
function snapshot(r: Resume): string {
  return JSON.stringify({ title: r.title, target_role: r.target_role, sections: r.sections });
}

export default function ResumeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [resumeId, setResumeId] = useState(id || "");

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SectionKey>("header");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // AI prompt modal state
  const [aiSection, setAiSection] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCopied, setAiCopied] = useState(false);

  // Autosave
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Dirty tracking — snapshot at last save
  const lastSavedSnapshot = useRef("");
  const [dirty, setDirty] = useState(false);

  // Fetch existing resume
  const fetchResume = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, status } = await getResume(id);
    if (status === 404 || !data) {
      navigate("/resumes");
      return;
    }
    data.sections = ensureAllSections(data.sections);
    setResume(data);
    setResumeId(data.id);
    lastSavedSnapshot.current = snapshot(data);
    setDirty(false);
    setLoading(false);
  }, [id, navigate]);

  // Init: fetch existing or build draft from profile
  useEffect(() => {
    if (id) {
      fetchResume();
    } else {
      const draft = buildDraftFromProfile(profile);
      setResume(draft);
      lastSavedSnapshot.current = snapshot(draft);
      setDirty(false);
      setLoading(false);
    }
  }, [id, fetchResume, profile]);

  /** Autosave — works for both drafts and existing resumes. */
  function save(updated: Resume) {
    setResume(updated);

    const isDirtyNow = snapshot(updated) !== lastSavedSnapshot.current;
    setDirty(isDirtyNow);

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // Re-check dirty against latest snapshot
      const currentSnapshot = snapshot(updated);
      if (currentSnapshot === lastSavedSnapshot.current) return;

      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);

      if (updated.id) {
        // Existing resume — PATCH
        const { error } = await updateResume(updated.id, {
          title: updated.title,
          target_role: updated.target_role,
          sections: updated.sections,
        });
        if (error) {
          setToast({ message: error, type: "error" });
        } else {
          lastSavedSnapshot.current = currentSnapshot;
          setDirty(false);
        }
      } else {
        // Draft — create on server
        const { data, error } = await createResume({
          title: updated.title,
          target_role: updated.target_role,
          sections: updated.sections,
        });
        if (error) {
          setToast({ message: error, type: "error" });
        } else if (data) {
          setResumeId(data.id);
          setResume((prev) => prev ? { ...prev, _id: data.id } : prev);
          lastSavedSnapshot.current = currentSnapshot;
          setDirty(false);
          // Update URL without full reload
          window.history.replaceState(null, "", `/resumes/${data.id}`);
        }
      }

      savingRef.current = false;
      setSaving(false);
    }, 800);
  }

  function updateSection(sectionId: string, updated: SectionType) {
    if (!resume) return;
    save({
      ...resume,
      sections: resume.sections.map((s) =>
        s.id === sectionId ? updated : s,
      ),
    });
  }

  function toggleSectionVisibility(sectionId: string) {
    if (!resume) return;
    save({
      ...resume,
      sections: resume.sections.map((s) =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s,
      ),
    });
  }

  function openAiPrompt(sectionTitle: string) {
    setAiSection(sectionTitle);
    setAiPrompt(
      SECTION_PROMPT(
        sectionTitle,
        resume?.target_role || "",
        profile.summary,
        profile.skills,
      ),
    );
  }

  // Get the active section from current tab
  const activeSection = resume?.sections.find(
    (s) => labelToKey(s.title) === activeTab,
  );

  if (loading || !resume) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  const previewUrl = resumeId ? `/resumes/${resumeId}/preview` : null;

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* AI prompt modal */}
      {aiSection && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-(--color-text)">
                AI Assist
              </h3>
              <button
                onClick={() => setAiSection(null)}
                className="p-1.5 rounded-lg text-(--color-text-tertiary) hover:text-(--color-text) cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[13px] text-(--color-text-secondary) mb-3">
              Copy this prompt into any chatbot, then paste the response into the section.
            </p>

            <div className="relative mb-4">
              <pre className="text-[12px] leading-relaxed text-(--color-text-secondary) bg-(--color-surface-sunken) rounded-xl p-4 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto border border-(--color-border)">
                {aiPrompt}
              </pre>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(aiPrompt);
                  setAiCopied(true);
                  setTimeout(() => setAiCopied(false), 2000);
                }}
                style={{ boxShadow: "var(--shadow-sm)" }}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-(--color-surface-raised) border border-(--color-border) text-[11px] font-medium text-(--color-text-secondary) hover:text-(--color-text) cursor-pointer"
              >
                {aiCopied ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              onClick={() => setAiSection(null)}
              className="w-full accent-gradient px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-md cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
          <input
            type="text"
            value={resume.title}
            onChange={(e) => save({ ...resume, title: e.target.value })}
            className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) tracking-tight bg-transparent border-none focus:outline-none w-full"
            placeholder="Untitled"
          />
          <div className="flex items-center gap-2 shrink-0">
            {saving && (
              <span className="text-[11px] text-(--color-text-tertiary)">
                Saving...
              </span>
            )}
            {!saving && !dirty && resumeId && (
              <span className="text-[11px] text-(--color-text-tertiary)">
                Saved
              </span>
            )}
            <button
              onClick={() => previewUrl && navigate(previewUrl)}
              disabled={!previewUrl || dirty}
              title={dirty ? "Save pending changes first" : "Preview resume"}
              className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Preview
            </button>
          </div>
        </div>
      </div>

      <hr className="divider my-4 sm:my-6" />

      {/* Mobile section selector — horizontal scrollable pills */}
      <div className="lg:hidden mb-4 -mx-6 px-6 overflow-x-auto animate-fade-up" style={{ animationDelay: "0.03s" }}>
        <div className="flex gap-1.5 pb-2 min-w-max">
          {SECTION_DEFS.map((def) => {
            const section = resume.sections.find((s) => s.title === def.label);
            const isActive = activeTab === def.key;
            const isHidden = section && !section.visible;

            return (
              <button
                key={def.key}
                type="button"
                onClick={() => setActiveTab(def.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-(--color-accent) text-white shadow-sm"
                    : "bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary)"
                } ${isHidden && !isActive ? "opacity-40" : ""}`}
              >
                {def.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar + Editor layout */}
      <div className="animate-fade-up flex gap-6" style={{ animationDelay: "0.05s" }}>
        {/* Left sidebar — sticky section index (desktop only) */}
        <nav className="hidden lg:block w-38 shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-none">
          <div className="flex flex-col gap-px">
            {SECTION_DEFS.map((def) => {
              const section = resume.sections.find((s) => s.title === def.label);
              const isActive = activeTab === def.key;
              const isHidden = section && !section.visible;

              return (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => setActiveTab(def.key)}
                  className={`relative text-left px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-(--color-accent) text-white shadow-sm"
                      : "text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-raised)"
                  } ${isHidden && !isActive ? "opacity-40" : ""}`}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right — section editor */}
        <div className="flex-1 min-w-0">
          {activeSection && (
            <div className="glass-card rounded-2xl p-6">
              {/* Section header with visibility toggle + AI assist */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-lg font-bold text-(--color-text)">
                  {activeSection.title}
                </h2>
                <div className="flex items-center gap-2">
                  {/* AI assist */}
                  <button
                    type="button"
                    onClick={() => openAiPrompt(activeSection.title)}
                    title="Generate with AI"
                    className="p-1.5 rounded-lg accent-gradient text-white shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                    </svg>
                  </button>

                  {/* Visibility toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSectionVisibility(activeSection.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeSection.visible ? "text-(--color-text-secondary) hover:text-(--color-text)" : "text-(--color-text-tertiary) opacity-50"}`}
                    title={activeSection.visible ? "Hide section" : "Show section"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      {activeSection.visible ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Section editor */}
              <ResumeSectionEditor
                sectionKey={activeTab}
                section={activeSection}
                onChange={(updated) => updateSection(activeSection.id, updated)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
