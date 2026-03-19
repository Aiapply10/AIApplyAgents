import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  fullWidth = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder ?? "Select...";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${fullWidth ? "w-full" : ""} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-(--color-surface-sunken) border border-(--color-border) text-sm outline-none cursor-pointer transition-all duration-150 hover:border-(--color-text-tertiary) ${
          open
            ? "border-(--color-accent) ring-2 ring-(--color-accent-glow)"
            : ""
        } ${fullWidth ? "w-full" : ""} ${
          selected ? "text-(--color-text)" : "text-(--color-text-tertiary)"
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-(--color-text-tertiary) transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 min-w-full rounded-xl bg-(--color-surface-raised) border border-(--color-border) overflow-hidden animate-fade-up"
          style={{
            animationDuration: "0.12s",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="p-1 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 cursor-pointer ${
                    isSelected
                      ? "bg-(--color-accent-subtle) text-(--color-accent)"
                      : "text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken)"
                  }`}
                >
                  {/* Check mark for selected */}
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-(--color-accent)" : "text-transparent"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
