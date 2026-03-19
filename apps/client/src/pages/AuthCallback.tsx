import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInAndUp } from "supertokens-auth-react/recipe/thirdparty";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        const res = await signInAndUp();
        if (res.status === "OK") {
          navigate("/");
        } else if (res.status === "SIGN_IN_UP_NOT_ALLOWED") {
          setError("Sign in not allowed. Please contact support.");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } catch {
        setError("Something went wrong during sign-in.");
      }
    }
    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-(--color-surface) flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="glass-card rounded-2xl !border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600 font-medium mb-5">
            {error}
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm text-(--color-accent) hover:underline font-semibold cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-surface) flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center mx-auto mb-4 shadow-md animate-pulse-glow">
          <svg className="w-5 h-5 text-white animate-spin-slow" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
        </div>
        <p className="text-sm font-medium text-(--color-text-secondary)">
          Completing sign-in...
        </p>
      </div>
    </div>
  );
}
