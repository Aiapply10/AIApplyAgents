import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "supertokens-auth-react/recipe/emailpassword";
import { getAuthorisationURLWithQueryParamsAndSetState } from "supertokens-auth-react/recipe/thirdparty";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

export default function Auth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp({
          formFields: [
            { id: "email", value: email },
            { id: "password", value: password },
          ],
        });
        if (res.status === "FIELD_ERROR") {
          setError(res.formFields.map((f) => f.error).join(". "));
          return;
        }
        if (res.status !== "OK") {
          setError("Sign up failed. Please try again.");
          return;
        }
      } else {
        const res = await signIn({
          formFields: [
            { id: "email", value: email },
            { id: "password", value: password },
          ],
        });
        if (res.status === "FIELD_ERROR") {
          setError(res.formFields.map((f) => f.error).join(". "));
          return;
        }
        if (res.status === "WRONG_CREDENTIALS_ERROR") {
          setError("Invalid email or password.");
          return;
        }
        if (res.status !== "OK") {
          setError("Sign in failed. Please try again.");
          return;
        }
      }
      navigate("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    try {
      const url = await getAuthorisationURLWithQueryParamsAndSetState({
        thirdPartyId: "google",
        frontendRedirectURI: `${window.location.origin}/auth/callback/google`,
      });
      window.location.assign(url);
    } catch {
      setError("Could not start Google sign-in. Please try again.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-text) placeholder-(--color-text-tertiary) focus:outline-none input-glow focus:border-(--color-accent) transition-all duration-200";

  return (
    <div className="min-h-screen bg-(--color-surface) flex">
      {/* Left panel — dramatic branding */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] relative overflow-hidden items-center justify-center">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500" />
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating orbs for depth */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-cyan-300/15 blur-3xl" />

        <div className="relative z-10 max-w-md px-12">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <h2 className="text-5xl xl:text-6xl font-display font-bold text-white leading-[1.1] mb-6">
            Your career,<br />
            <span className="text-cyan-200">automated.</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Stop applying manually. Let AI handle the repetitive work while you
            focus on what matters.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              1,200+ sent
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              50+ platforms
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Logo size="sm" />
            <span className="font-display font-bold text-sm text-(--color-text)">
              AI Apply Agents
            </span>
          </div>
          <div className="lg:ml-auto" />
          <ThemeToggle />
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[400px]">
            {/* Header */}
            <div className="mb-8 animate-fade-up">
              <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
                {isSignUp ? "Create account" : "Welcome back"}
              </h1>
              <p className="text-(--color-text-secondary) mt-2 text-[15px]">
                {isSignUp
                  ? "Start automating your job search"
                  : "Sign in to continue"}
              </p>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="animate-fade-up w-full flex items-center justify-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-raised) px-4 py-3 text-sm font-medium text-(--color-text) hover:border-(--color-text-tertiary) transition-all duration-200 cursor-pointer"
              style={{ animationDelay: "0.05s", boxShadow: "var(--shadow-sm)" }}
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative my-7 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-(--color-border)" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-(--color-surface) px-4 text-xs font-medium text-(--color-text-tertiary) uppercase tracking-widest">
                  or
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <div>
                <label htmlFor="email" className="block text-[13px] font-semibold text-(--color-text) mb-2">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="password" className="block text-[13px] font-semibold text-(--color-text) mb-2">Password</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
              </div>

              {error && (
                <div className="glass-card rounded-xl !border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl accent-gradient px-4 py-3 text-sm font-bold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
              >
                {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            {/* Toggle */}
            <p className="mt-7 text-center text-sm text-(--color-text-secondary) animate-fade-up" style={{ animationDelay: "0.2s" }}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-(--color-accent) hover:underline font-semibold cursor-pointer"
              >
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-(--color-text-tertiary)">
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
