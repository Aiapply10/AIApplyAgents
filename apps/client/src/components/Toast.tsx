import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDone: () => void;
}

export default function Toast({ message, type, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed top-5 right-5 z-[100]">
      <div
        className={`glass-card rounded-xl px-5 py-3.5 text-sm font-medium transition-all duration-300 ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-3 scale-95"}`}
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center gap-3">
          {type === "success" ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
          )}
          <span className="text-(--color-text)">{message}</span>
        </div>
      </div>
    </div>
  );
}
