import { useRef } from "react";

interface AvatarProps {
  url: string;
  name: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onFileSelect?: (dataUrl: string) => void;
}

const sizes = {
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-xl",
  lg: "w-24 h-24 text-3xl",
};

export default function Avatar({
  url,
  name,
  size = "md",
  editable = false,
  onFileSelect,
}: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onFileSelect) return;
    const reader = new FileReader();
    reader.onload = () => onFileSelect(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative inline-block">
      {url ? (
        <img
          src={url}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-(--color-border) shadow-md`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full accent-gradient text-white font-display font-bold flex items-center justify-center shadow-md`}
        >
          {initials || "?"}
        </div>
      )}

      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200 cursor-pointer"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
              />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}
