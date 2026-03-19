import { useCallback, useEffect, useState } from "react";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { getProfile, upsertProfile, type UserProfile } from "../lib/api";
import { useProfile, emptyProfile } from "../hooks/useProfile";
import Toast from "../components/Toast";
import ProfileCompleteness from "../components/ProfileCompleteness";
import Avatar from "../components/Avatar";

export default function Profile() {
  const session = useSessionContext();
  const userId =
    !session.loading && session.doesSessionExist ? session.userId : "";
  const { refresh: refreshCtx } = useProfile();

  const [form, setForm] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [skillInput, setSkillInput] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, status } = await getProfile(userId);
    if (status === 404 || !data) {
      setIsNew(true);
      setForm(emptyProfile);
    } else {
      setIsNew(false);
      setForm(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);

    const { error } = await upsertProfile(userId, {
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

    if (error) {
      setToast({ message: error, type: "error" });
    } else {
      setToast({ message: "Profile saved", type: "success" });
      setIsNew(false);
      await refreshCtx();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-text) placeholder-(--color-text-tertiary) focus:outline-none input-glow focus:border-(--color-accent) transition-all duration-200";

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      <ProfileCompleteness />

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
          Profile
        </h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">
          {isNew
            ? "Set up your profile to start automating applications."
            : "Keep your information up to date for best results."}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Personal info ── */}
        <section className="glass-card rounded-2xl p-6 mb-5 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <h2 className="font-display text-lg font-bold text-(--color-text) mb-5">
            Personal Information
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6">
            <Avatar
              url={form.avatar_url}
              name={form.full_name || "?"}
              size="lg"
              editable
              onFileSelect={(dataUrl) => set("avatar_url", dataUrl)}
            />
            <div>
              <p className="text-sm font-semibold text-(--color-text)">Profile photo</p>
              <p className="text-[12px] text-(--color-text-tertiary)">Click to upload</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" className={inputClass} required />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">Headline</label>
              <input type="text" value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Senior Software Engineer" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">Location</label>
              <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="San Francisco, CA" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" className={inputClass} />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[13px] font-semibold text-(--color-text) mb-2">Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="A brief description of your experience and career goals..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
        </section>

        {/* ── Links ── */}
        <section className="glass-card rounded-2xl p-6 mb-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="font-display text-lg font-bold text-(--color-text) mb-5">Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">LinkedIn</label>
              <input type="url" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">GitHub</label>
              <input type="url" value={form.github_url} onChange={(e) => set("github_url", e.target.value)} placeholder="https://github.com/..." className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-(--color-text) mb-2">Portfolio</label>
              <input type="url" value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>
        </section>

        {/* ── Skills ── */}
        <section className="glass-card rounded-2xl p-6 mb-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <h2 className="font-display text-lg font-bold text-(--color-text) mb-5">Skills</h2>

          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {form.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg accent-gradient text-white text-[13px] font-medium shadow-sm">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="hover:opacity-70 cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
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
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter"
              className={`flex-1 ${inputClass}`}
            />
            <button type="button" onClick={addSkill} className="px-5 py-3 rounded-xl border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) transition-all duration-200 cursor-pointer shadow-sm">
              Add
            </button>
          </div>
        </section>

        {/* ── Save ── */}
        <div className="flex justify-end animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl accent-gradient text-sm font-bold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
          >
            {saving ? "Saving..." : isNew ? "Create Profile" : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}
