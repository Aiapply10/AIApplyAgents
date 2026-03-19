export default function Logo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const icon = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };

  return (
    <div
      className={`${dims[size]} rounded-xl accent-gradient flex items-center justify-center shadow-md`}
    >
      <svg
        className={`${icon[size]} text-white`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
        />
      </svg>
    </div>
  );
}
