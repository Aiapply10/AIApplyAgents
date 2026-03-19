import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { upsertProfile, type UserProfile } from "../lib/api";
import { useProfile, emptyProfile } from "../hooks/useProfile";
import Avatar from "../components/Avatar";
import Logo from "../components/Logo";
import { useTheme } from "../hooks/useTheme";

// ── AI prompt template ──

const AI_PROMPT = `I'm setting up my job application profile. Please respond with ONLY a markdown document using the exact template below, filled in with my information. Do not add any other text before or after the markdown.

Ask me questions if needed to fill in the details, or fill in what you know about me.

\`\`\`markdown
# Profile

## Full Name
[Your full name]

## Headline
[Your professional headline, e.g. "Senior Software Engineer"]

## Summary
[2-3 sentence professional summary]

## Location
[City, State/Country]

## Phone
[Phone number with country code]

## LinkedIn
[Full LinkedIn URL]

## GitHub
[Full GitHub URL]

## Portfolio
[Portfolio or personal website URL]

## Skills
- [Skill 1]
- [Skill 2]
- [Skill 3]
- [Add more as needed]
\`\`\``;

const RESUME_PROMPT = `I'm going to paste my resume text below. Please extract the information and respond with ONLY a markdown document using this exact template. Fill in what you can find, leave sections empty if the information isn't in the resume.

\`\`\`markdown
# Profile

## Full Name
[Name from resume]

## Headline
[Current/most recent job title]

## Summary
[2-3 sentence professional summary based on the resume]

## Location
[Location if mentioned]

## Phone
[Phone if mentioned]

## LinkedIn
[LinkedIn URL if mentioned]

## GitHub
[GitHub URL if mentioned]

## Portfolio
[Portfolio URL if mentioned]

## Skills
- [Extracted skills]
\`\`\`

Here is my resume:

---
[PASTE YOUR RESUME TEXT HERE]
---`;

// ── Markdown parser ──

function parseProfileMarkdown(md: string): Partial<UserProfile> {
  const result: Partial<UserProfile> = {};

  function extract(heading: string): string {
    // Match ## Heading followed by content until next ## or end
    const regex = new RegExp(
      `##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
      "i",
    );
    const match = md.match(regex);
    if (!match) return "";
    return match[1]
      .replace(/^\[.*?\]$/gm, "") // remove placeholder brackets
      .trim();
  }

  function extractList(heading: string): string[] {
    const raw = extract(heading);
    if (!raw) return [];
    return raw
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("[") &&
          line.toLowerCase() !== "add more as needed",
      );
  }

  result.full_name = extract("Full Name");
  result.headline = extract("Headline");
  result.summary = extract("Summary");
  result.location = extract("Location");
  result.phone = extract("Phone");
  result.linkedin_url = extract("LinkedIn");
  result.github_url = extract("GitHub");
  result.portfolio_url = extract("Portfolio");
  result.skills = extractList("Skills");

  return result;
}

// ── Steps config ──

const formSteps = [
  { title: "Let's get started", desc: "Tell us about yourself" },
  { title: "Where are you?", desc: "Location and contact info" },
  { title: "Your links", desc: "Help employers find you online" },
  { title: "Your skills", desc: "What are you great at?" },
];

const totalSteps = formSteps.length + 1; // +1 for AI step

const inputClass =
  "w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-text) placeholder-(--color-text-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/30 focus:border-(--color-accent) focus:input-glow transition-all duration-200";

function CopyablePrompt({
  text,
  copied,
  onCopy,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="relative mb-6">
      <pre className="text-[12px] leading-relaxed text-(--color-text-secondary) bg-(--color-surface-sunken) rounded-xl p-4 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-(--color-border)">
        {text}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        style={{ boxShadow: "var(--shadow-sm)" }}
        className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-md bg-(--color-surface-raised) border border-(--color-border) text-[12px] font-medium text-(--color-text-secondary) hover:text-(--color-text) transition-all duration-200 cursor-pointer flex items-center gap-1.5"
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5 text-(--color-success)" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const session = useSessionContext();
  const { refresh } = useProfile();
  const { theme, toggle } = useTheme();
  const userId =
    !session.loading && session.doesSessionExist ? session.userId : "";

  // step 0 = method chooser, 0.1 = AI sub-view, 0.2 = resume sub-view, 1..4 = form steps
  const [step, setStep] = useState(0);
  const [subView, setSubView] = useState<"choose" | "ai" | "resume">("choose");
  const [form, setForm] = useState<UserProfile>({ ...emptyProfile });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");

  // AI step state
  const [copied, setCopied] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [parseError, setParseError] = useState("");

  // Resume state
  const [resumeText, setResumeText] = useState("");

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill() {
    const tag = skillInput.trim();
    if (tag && !form.skills.includes(tag)) {
      set("skills", [...form.skills, tag]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    set(
      "skills",
      form.skills.filter((s) => s !== skill),
    );
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleParseAndContinue() {
    setParseError("");
    const parsed = parseProfileMarkdown(pasteInput);

    if (!parsed.full_name) {
      setParseError(
        "Could not find a Full Name in the response. Make sure the markdown follows the template.",
      );
      return;
    }

    setForm((prev) => ({
      ...prev,
      full_name: parsed.full_name || prev.full_name,
      headline: parsed.headline || prev.headline,
      summary: parsed.summary || prev.summary,
      location: parsed.location || prev.location,
      phone: parsed.phone || prev.phone,
      linkedin_url: parsed.linkedin_url || prev.linkedin_url,
      github_url: parsed.github_url || prev.github_url,
      portfolio_url: parsed.portfolio_url || prev.portfolio_url,
      skills:
        parsed.skills && parsed.skills.length > 0
          ? parsed.skills
          : prev.skills,
    }));

    setStep(1);
  }

  function canContinue(): boolean {
    if (step === 0) return false; // AI step uses its own buttons
    if (step === 1) return form.full_name.trim().length > 0;
    return true;
  }

  async function handleNext() {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      await handleFinish();
    }
  }

  async function handleFinish() {
    if (!userId) return;
    setSaving(true);
    setError("");

    const { error: err } = await upsertProfile(userId, {
      full_name: form.full_name,
      avatar_url: form.avatar_url,
      headline: form.headline,
      summary: form.summary,
      location: form.location,
      phone: form.phone,
      linkedin_url: form.linkedin_url,
      github_url: form.github_url,
      portfolio_url: form.portfolio_url,
      skills: form.skills,
    });

    if (err) {
      setError(err);
      setSaving(false);
      return;
    }

    await refresh();
    navigate("/");
  }

  const isLast = step === totalSteps - 1;
  const formStep = step - 1; // maps step 1..4 to formSteps[0..3]

  return (
    <div className="min-h-screen bg-(--color-surface) flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-body font-semibold text-[13px] text-(--color-text) tracking-tight">
            AI Apply Agents
          </span>
        </div>
        <button
          onClick={toggle}
          className="text-[13px] text-(--color-text-tertiary) hover:text-(--color-text) transition-colors cursor-pointer"
        >
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <div className="flex gap-1.5 mb-10">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= step
                    ? "accent-gradient"
                    : "bg-(--color-surface-sunken)"
                }`}
              />
            ))}
          </div>

          {/* ── Step 0: Method chooser / AI / Resume ── */}
          {step === 0 && subView === "choose" && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <p className="text-[12px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">
                  Getting Started
                </p>
                <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
                  How would you like to set up?
                </h1>
                <p className="text-sm text-(--color-text-secondary) mt-1">
                  Choose the fastest way to fill your profile.
                </p>
              </div>

              <div className="space-y-3">
                {/* AI option */}
                <button
                  type="button"
                  onClick={() => setSubView("ai")}
                  className="w-full flex items-start gap-4 glow-card rounded-2xl p-5 text-left transition-all duration-200 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-(--color-surface-sunken) to-(--color-surface) flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-5 h-5 text-(--color-accent)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-(--color-text) group-hover:text-(--color-accent) transition-colors">
                      Fill with AI
                    </p>
                    <p className="text-[13px] text-(--color-text-tertiary) mt-0.5">
                      Copy a prompt into any chatbot, paste the response back. Fastest option.
                    </p>
                  </div>
                </button>

                {/* Resume option */}
                <button
                  type="button"
                  onClick={() => setSubView("resume")}
                  className="w-full flex items-start gap-4 glow-card rounded-2xl p-5 text-left transition-all duration-200 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-(--color-surface-sunken) to-(--color-surface) flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-5 h-5 text-(--color-accent)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-(--color-text) group-hover:text-(--color-accent) transition-colors">
                      Upload resume
                    </p>
                    <p className="text-[13px] text-(--color-text-tertiary) mt-0.5">
                      Copy a prompt + your resume text into a chatbot to extract your profile.
                    </p>
                  </div>
                </button>

                {/* Manual option */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full flex items-start gap-4 glow-card rounded-2xl p-5 text-left transition-all duration-200 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-(--color-surface-sunken) to-(--color-surface) flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-5 h-5 text-(--color-text-secondary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-(--color-text) group-hover:text-(--color-accent) transition-colors">
                      Fill manually
                    </p>
                    <p className="text-[13px] text-(--color-text-tertiary) mt-0.5">
                      Step through the form and fill everything yourself.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 0 sub-view: AI ── */}
          {step === 0 && subView === "ai" && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <p className="text-[12px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">
                  AI Setup
                </p>
                <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
                  Fill your profile with AI
                </h1>
                <p className="text-sm text-(--color-text-secondary) mt-1">
                  Copy this prompt into any chatbot, then paste the response below.
                </p>
              </div>

              <CopyablePrompt text={AI_PROMPT} copied={copied} onCopy={handleCopy} />

              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                  Paste the chatbot's response
                </label>
                <textarea
                  value={pasteInput}
                  onChange={(e) => { setPasteInput(e.target.value); setParseError(""); }}
                  placeholder="Paste the markdown response here..."
                  rows={6}
                  className={`${inputClass} resize-none font-mono text-[12px]`}
                />
              </div>

              {parseError && (
                <div className="rounded-lg bg-(--color-error-bg) border border-(--color-error)/10 px-4 py-3 text-sm text-(--color-error) mb-4">
                  {parseError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setSubView("choose"); setParseError(""); }} className="text-[13px] text-(--color-text-secondary) hover:text-(--color-text) transition-colors cursor-pointer">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleParseAndContinue}
                  disabled={!pasteInput.trim()}
                  className="accent-gradient px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                >
                  Parse & Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Step 0 sub-view: Resume ── */}
          {step === 0 && subView === "resume" && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <p className="text-[12px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">
                  Resume Import
                </p>
                <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
                  Import from resume
                </h1>
                <p className="text-sm text-(--color-text-secondary) mt-1">
                  Copy this prompt into a chatbot along with your resume text, then paste the response below.
                </p>
              </div>

              <CopyablePrompt
                text={RESUME_PROMPT}
                copied={copied}
                onCopy={async () => {
                  await navigator.clipboard.writeText(RESUME_PROMPT);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              />

              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                  Paste the chatbot's response
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => { setResumeText(e.target.value); setParseError(""); }}
                  placeholder="Paste the markdown response here..."
                  rows={6}
                  className={`${inputClass} resize-none font-mono text-[12px]`}
                />
              </div>

              {parseError && (
                <div className="rounded-lg bg-(--color-error-bg) border border-(--color-error)/10 px-4 py-3 text-sm text-(--color-error) mb-4">
                  {parseError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setSubView("choose"); setParseError(""); }} className="text-[13px] text-(--color-text-secondary) hover:text-(--color-text) transition-colors cursor-pointer">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParseError("");
                    const parsed = parseProfileMarkdown(resumeText);
                    if (!parsed.full_name) {
                      setParseError("Could not find a Full Name. Make sure the chatbot used the template format.");
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      full_name: parsed.full_name || prev.full_name,
                      headline: parsed.headline || prev.headline,
                      summary: parsed.summary || prev.summary,
                      location: parsed.location || prev.location,
                      phone: parsed.phone || prev.phone,
                      linkedin_url: parsed.linkedin_url || prev.linkedin_url,
                      github_url: parsed.github_url || prev.github_url,
                      portfolio_url: parsed.portfolio_url || prev.portfolio_url,
                      skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : prev.skills,
                    }));
                    setStep(1);
                  }}
                  disabled={!resumeText.trim()}
                  className="accent-gradient px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                >
                  Parse & Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Form Steps 1–4 ── */}
          {step >= 1 && (
            <>
              {/* Step header */}
              <div className="mb-8 animate-fade-up" key={`header-${step}`}>
                <p className="text-[12px] text-(--color-text-tertiary) uppercase tracking-widest mb-1">
                  Step {step + 1} of {totalSteps}
                </p>
                <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
                  {formSteps[formStep].title}
                </h1>
                <p className="text-sm text-(--color-text-secondary) mt-1">
                  {formSteps[formStep].desc}
                </p>
              </div>

              {/* Step content */}
              <div className="animate-fade-up" key={`content-${step}`}>
                {formStep === 0 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-5">
                      <Avatar
                        url={form.avatar_url}
                        name={form.full_name || "?"}
                        size="lg"
                        editable
                        onFileSelect={(dataUrl) =>
                          set("avatar_url", dataUrl)
                        }
                      />
                      <div className="text-sm text-(--color-text-tertiary)">
                        <p>Upload a photo</p>
                        <p className="text-[12px]">(optional)</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        Full Name{" "}
                        <span className="text-(--color-error)">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(e) => set("full_name", e.target.value)}
                        placeholder="Jane Doe"
                        className={inputClass}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        Headline
                      </label>
                      <input
                        type="text"
                        value={form.headline}
                        onChange={(e) => set("headline", e.target.value)}
                        placeholder="Senior Software Engineer"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        Summary
                      </label>
                      <textarea
                        value={form.summary}
                        onChange={(e) => set("summary", e.target.value)}
                        placeholder="A brief description of your experience..."
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>
                )}

                {formStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => set("location", e.target.value)}
                        placeholder="San Francisco, CA"
                        className={inputClass}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={form.linkedin_url}
                        onChange={(e) => set("linkedin_url", e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className={inputClass}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        GitHub
                      </label>
                      <input
                        type="url"
                        value={form.github_url}
                        onChange={(e) => set("github_url", e.target.value)}
                        placeholder="https://github.com/..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-(--color-text) mb-2">
                        Portfolio
                      </label>
                      <input
                        type="url"
                        value={form.portfolio_url}
                        onChange={(e) => set("portfolio_url", e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-5">
                    {form.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 accent-gradient text-white rounded-lg px-3 py-1.5 text-[13px] font-medium shadow-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="hover:opacity-70 transition-colors cursor-pointer"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18 18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        placeholder="Type a skill and press Enter"
                        className={`flex-1 ${inputClass}`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer px-4 py-2.5"
                      >
                        Add
                      </button>
                    </div>

                    <p className="text-[12px] text-(--color-text-tertiary)">
                      Add skills like "Python", "React", "Project Management"
                    </p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-(--color-error-bg) border border-(--color-error)/10 px-4 py-3 text-sm text-(--color-error) mt-5">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        setStep(0);
                        setSubView("choose");
                      } else {
                        setStep(step - 1);
                      }
                    }}
                    className="text-[13px] text-(--color-text-secondary) hover:text-(--color-text) transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {!isLast && formStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="text-[13px] text-(--color-text-tertiary) hover:text-(--color-text-secondary) transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canContinue() || saving}
                    className="accent-gradient px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                  >
                    {saving
                      ? "Saving..."
                      : isLast
                        ? "Finish"
                        : "Continue"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
