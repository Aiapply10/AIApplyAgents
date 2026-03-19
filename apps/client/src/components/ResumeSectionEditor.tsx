import { useState, type ReactNode } from "react";
import type { ResumeSection } from "../lib/resume-api";

// ── Section definitions ──

export const SECTION_DEFS = [
  { key: "header", label: "Header" },
  { key: "summary", label: "Summary" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
  { key: "certifications", label: "Certs" },
  { key: "achievements", label: "Achievements" },
  { key: "open_source", label: "Open Source" },
  { key: "leadership", label: "Leadership" },
  { key: "publications", label: "Publications" },
  { key: "additional", label: "Additional" },
] as const;

export type SectionKey = (typeof SECTION_DEFS)[number]["key"];

/** Check whether a section has any meaningful content. */
export function sectionHasContent(section: ResumeSection): boolean {
  if (section.content.trim()) return true;
  if (section.items.length > 0) return true;
  if (section.entries.length > 0) return true;
  return false;
}

/** Ensure all predefined sections exist in the array. Missing sections default to hidden. */
export function ensureAllSections(sections: ResumeSection[]): ResumeSection[] {
  const result = [...sections];
  for (const def of SECTION_DEFS) {
    if (!result.find((s) => s.title === def.label)) {
      result.push({
        id: crypto.randomUUID(),
        title: def.label,
        type: "entries",
        content: "",
        items: [],
        entries: [],
        visible: false,
        order: result.length,
      });
    }
  }
  return result;
}

// ── Shared styles ──

const inputClass =
  "w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-text) placeholder-(--color-text-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/30 focus:border-(--color-accent) focus:input-glow transition-all duration-200";

// ── Field config for entry-based sections ──

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea";
  half?: boolean;
}

interface EntryConfig {
  fields: FieldDef[];
  summary: (e: Record<string, unknown>) => string;
  empty: () => Record<string, unknown>;
}

const ENTRY_CONFIGS: Record<string, EntryConfig> = {
  skills: {
    fields: [
      { key: "category", label: "Category", placeholder: "e.g. Frontend", type: "text", half: true },
      { key: "skills", label: "Skills", placeholder: "React, Next.js, Tailwind", type: "text", half: true },
    ],
    summary: (e) => `${e.category || "Untitled"}: ${e.skills || "..."}`,
    empty: () => ({ category: "", skills: "", _selected: true }),
  },
  experience: {
    fields: [
      { key: "company", label: "Company", placeholder: "Company name", type: "text", half: true },
      { key: "role", label: "Role", placeholder: "Senior Full Stack Engineer", type: "text", half: true },
      { key: "start_date", label: "Start", placeholder: "Jan 2022", type: "text", half: true },
      { key: "end_date", label: "End", placeholder: "Present", type: "text", half: true },
      { key: "description", label: "Achievements (one per line)", placeholder: "Designed and implemented...\nReduced processing time by 60%...", type: "textarea" },
    ],
    summary: (e) => `${e.role || "Role"} at ${e.company || "Company"}`,
    empty: () => ({ company: "", role: "", start_date: "", end_date: "", description: "", _selected: true }),
  },
  projects: {
    fields: [
      { key: "name", label: "Project Name", placeholder: "AI Job Auto-Apply Platform", type: "text", half: true },
      { key: "tech_stack", label: "Tech Stack", placeholder: "FastAPI, React, Camoufox", type: "text", half: true },
      { key: "description", label: "Description (one point per line)", placeholder: "Built a distributed system...\nImplemented resumable workflows...", type: "textarea" },
    ],
    summary: (e) => `${e.name || "Untitled"} | ${e.tech_stack || "..."}`,
    empty: () => ({ name: "", tech_stack: "", description: "", _selected: true }),
  },
  education: {
    fields: [
      { key: "degree", label: "Degree", placeholder: "B.Tech in Computer Science", type: "text", half: true },
      { key: "institution", label: "Institution", placeholder: "University name", type: "text", half: true },
      { key: "year", label: "Year", placeholder: "2020", type: "text", half: true },
      { key: "coursework", label: "Relevant Coursework", placeholder: "Data Structures, ML, ...", type: "text", half: true },
    ],
    summary: (e) => `${e.degree || "Degree"} — ${e.institution || "Institution"}`,
    empty: () => ({ degree: "", institution: "", year: "", coursework: "", _selected: true }),
  },
  certifications: {
    fields: [
      { key: "name", label: "Certification", placeholder: "AWS Solutions Architect", type: "text" },
      { key: "issuer", label: "Issuer", placeholder: "Amazon Web Services", type: "text", half: true },
      { key: "year", label: "Year", placeholder: "2024", type: "text", half: true },
    ],
    summary: (e) => `${e.name || "Certification"}${e.issuer ? ` — ${e.issuer}` : ""}`,
    empty: () => ({ name: "", issuer: "", year: "", _selected: true }),
  },
  achievements: {
    fields: [
      { key: "description", label: "Achievement", placeholder: "Built X product generating ₹X revenue", type: "textarea" },
    ],
    summary: (e) => String(e.description || "Achievement").split("\n")[0].slice(0, 80) || "Achievement",
    empty: () => ({ description: "", _selected: true }),
  },
  open_source: {
    fields: [
      { key: "repo_name", label: "Repository", placeholder: "owner/repo-name", type: "text", half: true },
      { key: "contribution_type", label: "Contribution Type", placeholder: "Core maintainer / Feature / Bug fix", type: "text", half: true },
      { key: "impact", label: "Impact", placeholder: "500+ stars, used by X companies", type: "text" },
    ],
    summary: (e) => `${e.repo_name || "Repository"}${e.contribution_type ? ` — ${e.contribution_type}` : ""}`,
    empty: () => ({ repo_name: "", contribution_type: "", impact: "", _selected: true }),
  },
  leadership: {
    fields: [
      { key: "description", label: "Description", placeholder: "Led a team of 5 engineers on...", type: "textarea" },
    ],
    summary: (e) => String(e.description || "Leadership").split("\n")[0].slice(0, 80) || "Leadership",
    empty: () => ({ description: "", _selected: true }),
  },
  publications: {
    fields: [
      { key: "title", label: "Title", placeholder: "Article or blog title", type: "text" },
      { key: "url", label: "URL", placeholder: "https://...", type: "text" },
      { key: "description", label: "Description", placeholder: "Brief description", type: "text" },
    ],
    summary: (e) => String(e.title || "Publication"),
    empty: () => ({ title: "", url: "", description: "", _selected: true }),
  },
  additional: {
    fields: [
      { key: "category", label: "Category", placeholder: "Entrepreneurship / Speaking / Interests", type: "text" },
      { key: "description", label: "Description", placeholder: "Details...", type: "textarea" },
    ],
    summary: (e) => String(e.category || "Item"),
    empty: () => ({ category: "", description: "", _selected: true }),
  },
};

// ── Collapsible entry wrapper ──

function CollapsibleEntry({
  summary,
  selected,
  defaultOpen,
  onToggleSelected,
  onDelete,
  children,
}: {
  summary: string;
  selected: boolean;
  defaultOpen?: boolean;
  onToggleSelected: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className={`rounded-xl border bg-(--color-surface-raised) overflow-hidden transition-opacity duration-200 ${selected ? "border-(--color-border)" : "border-(--color-border) opacity-60"}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Selection checkbox */}
        <button
          type="button"
          onClick={onToggleSelected}
          className="shrink-0 cursor-pointer"
          title={selected ? "Deselect from preview" : "Select for preview"}
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${selected ? "border-(--color-accent) bg-(--color-accent)" : "border-(--color-border)"}`}>
            {selected && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 text-left cursor-pointer"
        >
          <span className="text-[13px] font-medium text-(--color-text) truncate block">
            {summary || "New entry"}
          </span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-lg text-(--color-text-tertiary) hover:text-(--color-error) transition-colors cursor-pointer shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-1 rounded-lg text-(--color-text-tertiary) hover:text-(--color-text) transition-colors cursor-pointer shrink-0"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-(--color-border-subtle)">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Generic entry list editor ──

function EntryListEditor({
  section,
  config,
  onChange,
}: {
  section: ResumeSection;
  config: EntryConfig;
  onChange: (updated: ResumeSection) => void;
}) {
  function updateEntry(idx: number, field: string, value: string) {
    const entries = [...section.entries];
    entries[idx] = { ...entries[idx], [field]: value };
    onChange({ ...section, entries });
  }

  function toggleEntrySelected(idx: number) {
    const entries = [...section.entries];
    const current = entries[idx]._selected !== false;
    entries[idx] = { ...entries[idx], _selected: !current };
    onChange({ ...section, entries });
  }

  function removeEntry(idx: number) {
    onChange({ ...section, entries: section.entries.filter((_, i) => i !== idx) });
  }

  function addEntry() {
    onChange({ ...section, entries: [...section.entries, config.empty()] });
  }

  return (
    <div className="space-y-3">
      {section.entries.map((entry, idx) => (
        <CollapsibleEntry
          key={idx}
          summary={config.summary(entry)}
          selected={entry._selected !== false}
          defaultOpen={section.entries.length === 1}
          onToggleSelected={() => toggleEntrySelected(idx)}
          onDelete={() => removeEntry(idx)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.fields.map((field) =>
              field.type === "textarea" ? (
                <div key={field.key} className="col-span-full">
                  <label className="text-[11px] font-medium text-(--color-text-tertiary) uppercase tracking-wider mb-1.5 block">
                    {field.label}
                  </label>
                  <textarea
                    value={String(entry[field.key] ?? "")}
                    onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className={`${inputClass} resize-none font-mono text-[12px]`}
                  />
                </div>
              ) : (
                <div key={field.key} className={field.half ? "" : "col-span-full"}>
                  <label className="text-[11px] font-medium text-(--color-text-tertiary) uppercase tracking-wider mb-1.5 block">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={String(entry[field.key] ?? "")}
                    onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </div>
              ),
            )}
          </div>
        </CollapsibleEntry>
      ))}

      <button
        type="button"
        onClick={addEntry}
        className="w-full py-2.5 rounded-xl border border-dashed border-(--color-border) text-[13px] font-medium text-(--color-text-secondary) hover:text-(--color-accent) hover:border-(--color-accent)/30 transition-all duration-200 cursor-pointer"
      >
        + Add Entry
      </button>
    </div>
  );
}

// ── Header section editor ──

function HeaderEditor({
  section,
  onChange,
}: {
  section: ResumeSection;
  onChange: (updated: ResumeSection) => void;
}) {
  const data = (section.entries[0] || {}) as Record<string, string>;

  function update(field: string, value: string) {
    const updated = { ...data, [field]: value };
    onChange({ ...section, entries: [updated] });
  }

  function toggleField(field: string) {
    const visKey = `_visible_${field}`;
    const current = data[visKey] !== "false";
    const updated = { ...data, [visKey]: current ? "false" : "true" };
    onChange({ ...section, entries: [updated] });
  }

  const fields: { key: string; label: string; placeholder: string; half?: boolean }[] = [
    { key: "full_name", label: "Full Name", placeholder: "Charanpreet Singh" },
    { key: "title", label: "Professional Title", placeholder: "Senior Full Stack Engineer | React, Node, AI Systems" },
    { key: "location", label: "Location", placeholder: "City, Country", half: true },
    { key: "phone", label: "Phone", placeholder: "+91 ...", half: true },
    { key: "email", label: "Email", placeholder: "you@example.com" },
    { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", half: true },
    { key: "github_url", label: "GitHub", placeholder: "https://github.com/...", half: true },
    { key: "portfolio_url", label: "Portfolio", placeholder: "https://...", half: true },
    { key: "blog_url", label: "Blog / Brand", placeholder: "https://...", half: true },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((f) => {
        const isVisible = data[`_visible_${f.key}`] !== "false";
        return (
          <div key={f.key} className={`${f.half ? "" : "col-span-full"} ${isVisible ? "" : "opacity-50"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => toggleField(f.key)}
                className="shrink-0 cursor-pointer"
                title={isVisible ? "Exclude from preview" : "Include in preview"}
              >
                <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all duration-200 ${isVisible ? "border-(--color-accent) bg-(--color-accent)" : "border-(--color-border)"}`}>
                  {isVisible && (
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </button>
              <label className="text-[11px] font-medium text-(--color-text-tertiary) uppercase tracking-wider">
                {f.label}
              </label>
            </div>
            <input
              type="text"
              value={data[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Summary section editor ──

function SummaryEditor({
  section,
  onChange,
}: {
  section: ResumeSection;
  onChange: (updated: ResumeSection) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-(--color-text-tertiary) uppercase tracking-wider mb-1.5 block">
        Professional Summary
      </label>
      <p className="text-[12px] text-(--color-text-tertiary) mb-3">
        3-5 lines. Market positioning, not "about me". Include years of experience, core stack, domain strengths, business impact.
      </p>
      <textarea
        value={section.content}
        onChange={(e) => onChange({ ...section, content: e.target.value })}
        placeholder="Senior Full Stack Engineer with 6+ years building scalable web systems using React, TypeScript, and Node.js..."
        rows={5}
        className={`${inputClass} resize-none`}
      />
    </div>
  );
}

// ── Main router component ──

interface Props {
  sectionKey: SectionKey;
  section: ResumeSection;
  onChange: (updated: ResumeSection) => void;
}

export default function ResumeSectionEditor({ sectionKey, section, onChange }: Props) {
  switch (sectionKey) {
    case "header":
      return <HeaderEditor section={section} onChange={onChange} />;
    case "summary":
      return <SummaryEditor section={section} onChange={onChange} />;
    default: {
      const config = ENTRY_CONFIGS[sectionKey];
      if (config) {
        return <EntryListEditor section={section} config={config} onChange={onChange} />;
      }
      return <p className="text-sm text-(--color-text-tertiary)">Unknown section type</p>;
    }
  }
}
