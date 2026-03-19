import { useNavigate } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";

export default function ProfileCompleteness() {
  const { completeness, loading } = useProfile();
  const navigate = useNavigate();

  if (loading || completeness >= 100) return null;

  return (
    <button
      onClick={() => navigate("/profile")}
      className="w-full mb-8 group cursor-pointer text-left animate-fade-up"
    >
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-(--color-accent)/3 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg accent-gradient flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-(--color-text) group-hover:text-(--color-accent) transition-colors">
                Complete your profile
              </p>
            </div>
            <p className="text-sm font-bold text-gradient">
              {completeness}%
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-(--color-surface-sunken) overflow-hidden">
            <div
              className="h-full rounded-full accent-gradient transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="text-[12px] text-(--color-text-tertiary) mt-2 group-hover:text-(--color-text-secondary) transition-colors">
            Better profiles get better job matches
          </p>
        </div>
      </div>
    </button>
  );
}
