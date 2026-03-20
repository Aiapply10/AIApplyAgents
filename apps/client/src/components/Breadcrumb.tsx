import { Link, useLocation, useParams } from "react-router-dom";

interface Crumb {
  label: string;
  to?: string;
}

const STATIC_LABELS: Record<string, string> = {
  "": "Dashboard",
  profile: "Profile",
  resumes: "Resumes",
  new: "New Resume",

  analyze: "Analyzer",
  preview: "Preview",
  "master-profile": "Master Profile",
  sources: "Job Sources",
  workflows: "Workflows",
  admin: "Admin",
  users: "Users",
  tenants: "Tenants",
  audit: "Audit Log",
  notifications: "Notifications",
};

export default function Breadcrumb() {
  const location = useLocation();
  const params = useParams<{ id?: string }>();

  const segments = location.pathname.split("/").filter(Boolean);

  // Don't render breadcrumb on Dashboard (root)
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [{ label: "Home", to: "/" }];

  let path = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;

    const isLast = i === segments.length - 1;

    // Dynamic resume ID segment
    if (params.id && seg === params.id) {
      crumbs.push({
        label: "Editor",
        to: isLast ? undefined : path,
      });
      continue;
    }

    const label = STATIC_LABELS[seg] || seg;
    crumbs.push({
      label,
      to: isLast ? undefined : path,
    });
  }

  return (
    <nav className="flex items-center gap-1.5 text-[12px]">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg className="w-3 h-3 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          )}
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="text-(--color-text-tertiary) hover:text-(--color-text) transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-(--color-text-secondary) font-medium">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
