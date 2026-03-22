import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createResumeFromMarkdown } from "../lib/resume-api";
import Toast from "../components/Toast";

const RESUME_PROMPT = `Generate a complete professional resume in markdown. Use EXACTLY the section headings and formats below. Replace all bracketed placeholders with real, compelling content. Quantify achievements wherever possible.

## Header
- **Name:** [Full Name]
- **Title:** [Professional Title, e.g. Senior Full Stack Engineer | React, Node, AI Systems]
- **Location:** [City, Country]
- **Phone:** [Phone Number]
- **Email:** [Email Address]
- **LinkedIn:** [Full LinkedIn URL]
- **GitHub:** [Full GitHub URL]
- **Portfolio:** [Portfolio URL, or remove line if none]

## Summary
[3-5 sentence professional summary. Lead with years of experience and core expertise. Include domain strengths, key technologies, and measurable business impact. This is market positioning, not a bio.]

## Skills
- **Frontend:** React, TypeScript, Next.js, Tailwind CSS
- **Backend:** Node.js, Python, FastAPI, PostgreSQL
- **DevOps:** Docker, AWS, CI/CD, Terraform
- **Other:** System Design, Agile, Technical Leadership

## Experience
- **[Role Title]** at **[Company Name]** ([Month Year] – [Month Year or Present])
  - [Achievement with metric, e.g. Reduced API response time by 40% by implementing Redis caching layer]
  - [Achievement with scope, e.g. Led migration of 3 microservices from Express to FastAPI, serving 2M+ requests/day]
  - [Achievement with business impact, e.g. Built real-time analytics dashboard that increased conversion by 15%]

- **[Role Title]** at **[Company Name]** ([Month Year] – [Month Year])
  - [Achievement]
  - [Achievement]

## Projects
- **[Project Name]** | [Tech Stack, e.g. FastAPI, React, Camoufox, MongoDB]
  - [What it does and why it matters, e.g. Multi-tenant job auto-apply platform with resumable browser automation workflows]
  - [Technical highlight, e.g. Designed event-driven architecture processing 10K+ applications/day]

- **[Project Name]** | [Tech Stack]
  - [Description]

## Education
- **[Degree, e.g. B.Tech in Computer Science]** — [Institution Name] ([Graduation Year])
  - Relevant Coursework: [Course 1, Course 2, Course 3]

## Certifications
- **[Certification Name, e.g. AWS Solutions Architect – Associate]** — [Issuer] ([Year])
- **[Certification Name]** — [Issuer] ([Year])

## Achievements
- [Concrete achievement, e.g. Built and scaled a SaaS product to ₹50L ARR with 200+ paying customers]
- [Award or recognition, e.g. Winner, Company-wide Hackathon 2024 — built AI-powered code review tool in 48 hours]
- [Quantified impact, e.g. Published 15+ technical articles with 100K+ total views on engineering blog]

## Open Source
- **[owner/repo-name]** — [Contribution Type, e.g. Core maintainer]
  - [Impact, e.g. 500+ GitHub stars, used by 50+ companies in production]

## Leadership
- [Leadership experience, e.g. Led a cross-functional team of 8 engineers and designers to deliver the company's first AI-powered feature, shipping 3 weeks ahead of schedule]
- [Mentorship, e.g. Mentored 4 junior developers through structured code review and pair programming sessions, all promoted within 12 months]

## Publications
- **[Title]** — [URL]
  - [Brief description, e.g. Deep dive into building resumable browser automation with Playwright and Redis]

## Additional
- **Entrepreneurship:** [e.g. Co-founded a developer tools startup, managed product from 0 to 5K users]
- **Speaking:** [e.g. Speaker at ReactConf 2024, JSNation 2023]
- **Interests:** [e.g. Open-source tooling, distributed systems, technical writing]

IMPORTANT: Include ALL 12 sections above. Use real-sounding, specific content — not generic filler. Every bullet should demonstrate impact, scope, or technical depth.`;

const inputClass =
  "w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-text) placeholder-(--color-text-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/30 focus:border-(--color-accent) focus:input-glow transition-all duration-200";

export default function ResumeFromAI() {
  const navigate = useNavigate();
  const [mdInput, setMdInput] = useState("");
  const [mdTitle, setMdTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(RESUME_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImport() {
    if (!mdInput.trim()) return;
    setCreating(true);
    const { data, error } = await createResumeFromMarkdown({
      title: mdTitle.trim() || "AI Generated Resume",
      markdown: mdInput,
    });
    if (error) {
      setToast({ message: error, type: "error" });
      setCreating(false);
    } else if (data) {
      navigate(`/resumes/${data.id}`, { replace: true });
    }
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

      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight mb-2">
          Import from AI
        </h1>
        <p className="text-sm text-(--color-text-secondary) mb-8">
          Copy the prompt below into any chatbot, then paste its markdown response to create a resume.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
        {/* Copyable prompt */}
        <div className="relative mb-6">
          <pre className="text-[12px] leading-relaxed text-(--color-text-secondary) bg-(--color-surface-sunken) rounded-xl p-4 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono border border-(--color-border)">
            {RESUME_PROMPT}
          </pre>
          <button
            type="button"
            onClick={handleCopyPrompt}
            style={{ boxShadow: "var(--shadow-sm)" }}
            className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-md bg-(--color-surface-raised) border border-(--color-border) text-[12px] font-medium text-(--color-text-secondary) hover:text-(--color-text) transition-all duration-200 cursor-pointer"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Import form */}
        <div className="space-y-3">
          <input
            type="text"
            value={mdTitle}
            onChange={(e) => setMdTitle(e.target.value)}
            placeholder="Resume title (optional)"
            className={inputClass}
          />
          <textarea
            value={mdInput}
            onChange={(e) => setMdInput(e.target.value)}
            placeholder="Paste the chatbot's markdown response here..."
            rows={8}
            className={`${inputClass} resize-none font-mono text-[12px]`}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => navigate("/resumes")}
              className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm cursor-pointer px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!mdInput.trim() || creating}
              className="accent-gradient px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-md disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {creating ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
