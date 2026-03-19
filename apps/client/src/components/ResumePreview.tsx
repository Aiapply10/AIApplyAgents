import type { ResumeSection } from "../lib/resume-api";

interface Props {
  sections: ResumeSection[];
  title?: string;
  targetRole?: string;
}

/** Filter entries to only selected ones. */
function selectedEntries(section: ResumeSection): Record<string, unknown>[] {
  return section.entries.filter((e) => e._selected !== false);
}

export default function ResumePreview({ sections }: Props) {
  const visible = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white dark:bg-(--color-surface-raised) rounded-2xl border border-(--color-border) shadow-sm p-8 min-h-[600px] font-serif text-(--color-text)">
      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-(--color-text-tertiary)">
            No visible sections to preview
          </p>
        </div>
      )}

      {/* Visible sections — only render sections that have content */}
      <div className="space-y-5">
        {visible.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: ResumeSection }) {
  const t = section.title;
  const entries = selectedEntries(section);

  // Header — render as contact header (no section heading)
  if (t === "Header") {
    if (entries.length === 0) return null;
    return <HeaderBlock entry={entries[0]} />;
  }

  // Summary — render content as paragraph
  if (t === "Summary") {
    if (!section.content) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <p className="text-[13px] leading-relaxed text-(--color-text-secondary) whitespace-pre-wrap">
          {section.content}
        </p>
      </div>
    );
  }

  // Skills — chip list
  if (t === "Skills") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const category = String(entry.category || "");
            const skills = String(entry.skills || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (skills.length === 0) return null;
            return (
              <div key={idx}>
                {category && (
                  <p className="text-[11px] font-semibold text-(--color-text) uppercase tracking-wider mb-1.5">
                    {category}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[12px] px-2.5 py-1 rounded-lg bg-(--color-surface-sunken) text-(--color-text-secondary) border border-(--color-border-subtle)"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Experience
  if (t === "Experience") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const role = String(entry.role ?? entry.title ?? "");
            const company = String(entry.company ?? entry.organization ?? "");
            const start = String(entry.start_date ?? "");
            const end = String(entry.end_date ?? "");
            const desc = String(entry.description ?? "");
            return (
              <div key={idx}>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    {role && <span className="text-[13px] font-semibold text-(--color-text)">{role}</span>}
                    {company && <span className="text-[13px] text-(--color-text-secondary)"> at {company}</span>}
                  </div>
                  {(start || end) && (
                    <span className="text-[11px] text-(--color-text-tertiary) shrink-0 font-mono">
                      {start || "?"} – {end || "Present"}
                    </span>
                  )}
                </div>
                {desc && <DescriptionBullets text={desc} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Projects
  if (t === "Projects") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const name = String(entry.name ?? "");
            const tech = String(entry.tech_stack ?? "");
            const desc = String(entry.description ?? "");
            return (
              <div key={idx}>
                <div className="flex items-baseline gap-2">
                  {name && <span className="text-[13px] font-semibold text-(--color-text)">{name}</span>}
                  {tech && <span className="text-[11px] text-(--color-text-tertiary)">| {tech}</span>}
                </div>
                {desc && <DescriptionBullets text={desc} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Education
  if (t === "Education") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const degree = String(entry.degree ?? entry.title ?? "");
            const institution = String(entry.institution ?? entry.organization ?? "");
            const year = String(entry.year ?? "");
            const coursework = String(entry.coursework ?? "");
            return (
              <div key={idx}>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    {degree && <span className="text-[13px] font-semibold text-(--color-text)">{degree}</span>}
                    {institution && <span className="text-[13px] text-(--color-text-secondary)"> — {institution}</span>}
                  </div>
                  {year && (
                    <span className="text-[11px] text-(--color-text-tertiary) shrink-0 font-mono">{year}</span>
                  )}
                </div>
                {coursework && (
                  <p className="text-[12px] text-(--color-text-tertiary) mt-0.5">{coursework}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Certifications
  if (t === "Certifications" || t === "Certs") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-1.5">
          {entries.map((entry, idx) => {
            const name = String(entry.name ?? entry.title ?? "");
            const issuer = String(entry.issuer ?? entry.organization ?? "");
            const year = String(entry.year ?? "");
            return (
              <div key={idx} className="flex items-baseline justify-between gap-2">
                <div>
                  {name && <span className="text-[13px] font-semibold text-(--color-text)">{name}</span>}
                  {issuer && <span className="text-[13px] text-(--color-text-secondary)"> — {issuer}</span>}
                </div>
                {year && <span className="text-[11px] text-(--color-text-tertiary) font-mono">{year}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Achievements / Leadership — description-only entries
  if (t === "Achievements" || t === "Leadership") {
    if (entries.length === 0 && !section.content) return null;
    return (
      <div>
        <SectionHeading title={t} />
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const desc = String(entry.description ?? "");
              return desc ? <DescriptionBullets key={idx} text={desc} /> : null;
            })}
          </div>
        ) : section.content ? (
          <p className="text-[13px] leading-relaxed text-(--color-text-secondary) whitespace-pre-wrap">
            {section.content}
          </p>
        ) : null}
      </div>
    );
  }

  // Open Source
  if (t === "Open Source") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const repo = String(entry.repo_name ?? "");
            const contribType = String(entry.contribution_type ?? "");
            const impact = String(entry.impact ?? "");
            return (
              <div key={idx}>
                <div className="flex items-baseline gap-2">
                  {repo && <span className="text-[13px] font-semibold text-(--color-text) font-mono">{repo}</span>}
                  {contribType && <span className="text-[12px] text-(--color-text-secondary)">({contribType})</span>}
                </div>
                {impact && <p className="text-[12px] text-(--color-text-tertiary) mt-0.5">{impact}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Publications
  if (t === "Publications") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-1.5">
          {entries.map((entry, idx) => {
            const pubTitle = String(entry.title ?? "");
            const url = String(entry.url ?? "");
            const desc = String(entry.description ?? "");
            return (
              <div key={idx}>
                <span className="text-[13px] font-semibold text-(--color-text)">{pubTitle || "Untitled"}</span>
                {url && <span className="text-[11px] text-(--color-text-tertiary) ml-2">{url}</span>}
                {desc && <p className="text-[12px] text-(--color-text-secondary) mt-0.5">{desc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Additional
  if (t === "Additional") {
    if (entries.length === 0) return null;
    return (
      <div>
        <SectionHeading title={t} />
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const category = String(entry.category ?? "");
            const desc = String(entry.description ?? "");
            return (
              <div key={idx}>
                {category && <span className="text-[13px] font-semibold text-(--color-text)">{category}: </span>}
                {desc && <span className="text-[13px] text-(--color-text-secondary)">{desc}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback — generic rendering for any unknown section
  const hasContent = section.content || entries.length > 0;
  if (!hasContent) return null;
  return (
    <div>
      <SectionHeading title={t} />
      {section.content && (
        <p className="text-[13px] leading-relaxed text-(--color-text-secondary) whitespace-pre-wrap">
          {section.content}
        </p>
      )}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="text-[13px] text-(--color-text-secondary)">
              {Object.entries(entry)
                .filter(([k, v]) => v && !k.startsWith("_"))
                .map(([k, v]) => `${k}: ${v}`)
                .join(" | ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ──

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wider text-(--color-text) mb-2 pb-1 border-b border-(--color-border-subtle)">
      {title}
    </h2>
  );
}

function HeaderBlock({ entry }: { entry: Record<string, unknown> }) {
  const data = entry as Record<string, string>;

  /** Check if a field is visible (defaults to true if flag absent). */
  function vis(key: string): boolean {
    return data[`_visible_${key}`] !== "false";
  }

  const name = vis("full_name") ? data.full_name : "";
  const title = vis("title") ? data.title : "";

  const contactParts = [
    vis("location") ? data.location : "",
    vis("phone") ? data.phone : "",
    vis("email") ? data.email : "",
  ].filter(Boolean);

  const links = [
    vis("linkedin_url") ? data.linkedin_url : "",
    vis("github_url") ? data.github_url : "",
    vis("portfolio_url") ? data.portfolio_url : "",
    vis("blog_url") ? data.blog_url : "",
  ].filter(Boolean);

  if (!name && !title && contactParts.length === 0 && links.length === 0) {
    return null;
  }

  return (
    <div className="text-center mb-6 pb-4 border-b border-(--color-border-subtle)">
      {name && <h1 className="text-2xl font-bold tracking-tight">{name}</h1>}
      {title && <p className="text-sm text-(--color-text-secondary) mt-1">{title}</p>}
      {contactParts.length > 0 && (
        <p className="text-[12px] text-(--color-text-tertiary) mt-1.5">
          {contactParts.join(" · ")}
        </p>
      )}
      {links.length > 0 && (
        <p className="text-[11px] text-(--color-text-tertiary) mt-1">
          {links.join(" · ")}
        </p>
      )}
    </div>
  );
}

function DescriptionBullets({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length <= 1) {
    return (
      <p className="text-[12px] leading-relaxed text-(--color-text-secondary) mt-0.5 whitespace-pre-wrap">
        {text}
      </p>
    );
  }
  return (
    <ul className="mt-1 space-y-0.5 list-disc list-inside">
      {lines.map((line, i) => (
        <li key={i} className="text-[12px] leading-relaxed text-(--color-text-secondary)">
          {line.replace(/^[-•]\s*/, "")}
        </li>
      ))}
    </ul>
  );
}
