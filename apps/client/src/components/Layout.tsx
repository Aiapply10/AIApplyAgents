import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "supertokens-auth-react/recipe/session";
import Logo from "./Logo";
import Breadcrumb from "./Breadcrumb";
import { useTheme } from "../hooks/useTheme";
import { useProfile } from "../hooks/useProfile";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  soon?: boolean;
  color: string;       // tailwind color for icon dot & active indicator
  colorActive: string; // text color when active
  colorBg: string;     // bg tint when active
  colorBorder: string; // left border when active
  children?: { to: string; label: string }[];
}

const nav: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    color: "bg-violet-500",
    colorActive: "text-violet-600 dark:text-violet-400",
    colorBg: "bg-violet-50 dark:bg-violet-500/10",
    colorBorder: "border-violet-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
      />
    ),
  },
  {
    to: "/resumes",
    label: "Resumes",
    color: "bg-emerald-500",
    colorActive: "text-emerald-600 dark:text-emerald-400",
    colorBg: "bg-emerald-50 dark:bg-emerald-500/10",
    colorBorder: "border-emerald-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    ),
    children: [
      { to: "/resumes", label: "Gallery" },
      { to: "/master-profile", label: "Master Profile" },
      { to: "/resumes/new", label: "New Resume" },

      { to: "/resumes/analyze", label: "Analyzer" },
    ],
  },
  {
    to: "/sources",
    label: "Job Sources",
    color: "bg-sky-500",
    colorActive: "text-sky-600 dark:text-sky-400",
    colorBg: "bg-sky-50 dark:bg-sky-500/10",
    colorBorder: "border-sky-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
      />
    ),
    soon: true,
  },
  {
    to: "/workflows",
    label: "Workflows",
    color: "bg-amber-500",
    colorActive: "text-amber-600 dark:text-amber-400",
    colorBg: "bg-amber-50 dark:bg-amber-500/10",
    colorBorder: "border-amber-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
      />
    ),
    soon: true,
  },
];

interface AdminNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const adminNav: AdminNavItem[] = [
  {
    to: "/admin",
    label: "Overview",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />,
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
  },
  {
    to: "/admin/tenants",
    label: "Tenants",
    adminOnly: true,
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />,
  },
  {
    to: "/admin/audit",
    label: "Audit Log",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />,
  },
  {
    to: "/admin/notifications",
    label: "Notifications",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />,
  },
];

const ROUTE_COLORS: Record<string, string> = {
  "/": "route-dashboard",
  "/profile": "route-profile",
  "/resumes": "route-resumes",
  "/master-profile": "route-resumes",
  "/sources": "route-sources",
  "/workflows": "route-workflows",
  "/admin": "route-admin",
};

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { profile: profileData, email: userEmail, role: userRole } = useProfile();
  const isAdmin = userRole === "admin";
  const isManagerOrAdmin = userRole === "admin" || userRole === "manager";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = profileData.full_name || (isAdmin ? "Admin" : "");

  // Resolve route color class
  const routeColorClass = (() => {
    const path = location.pathname;
    if (path === "/") return ROUTE_COLORS["/"];
    for (const prefix of Object.keys(ROUTE_COLORS)) {
      if (prefix !== "/" && path.startsWith(prefix)) return ROUTE_COLORS[prefix];
    }
    return ROUTE_COLORS["/"];
  })();

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  const sidebarContent = (
    <div className="flex flex-col h-full relative noise">
      {/* Logo */}
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-display font-bold text-sm text-(--color-text) tracking-tight">
            AI Apply Agents
          </span>
        </div>
      </div>

      {/* Navigation — member/manager menu (hidden for admins) */}
      {!isAdmin && (
        <nav className="flex-1 px-3">
          <p className="px-3 mb-2 text-[10px] font-bold text-(--color-text-tertiary) uppercase tracking-[0.15em]">
            Menu
          </p>
          <div className="space-y-1">
            {nav.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const childPaths = item.children?.map((c) => c.to) ?? [];
            const isParentActive = (location.pathname.startsWith(item.to) && item.to !== "/") || childPaths.some((p) => location.pathname.startsWith(p));
              const isOpen = hasChildren && (submenuOpen[item.to] ?? isParentActive);

              if (hasChildren) {
                return (
                  <div key={item.to}>
                    <button
                      onClick={() =>
                        setSubmenuOpen((prev) => ({
                          ...prev,
                          [item.to]: !isOpen,
                        }))
                      }
                      className={`w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer border-l-[3px] ${
                        isParentActive
                          ? `${item.colorBg} ${item.colorActive} ${item.colorBorder}`
                          : "text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken) border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.color}`} />
                        <svg
                          className={`w-[18px] h-[18px] transition-colors ${isParentActive ? item.colorActive : "text-(--color-text-tertiary) group-hover:text-(--color-text-secondary)"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          {item.icon}
                        </svg>
                        <span>{item.label}</span>
                      </div>
                      <svg
                        className={`ml-auto w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"} ${isParentActive ? item.colorActive : "text-(--color-text-tertiary)"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="ml-9 mt-1 space-y-0.5 border-l border-(--color-border) pl-3">
                        {item.children!.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            end
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              `block px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                                isActive
                                  ? `${item.colorActive} ${item.colorBg}`
                                  : "text-(--color-text-tertiary) hover:text-(--color-text) hover:bg-(--color-surface-sunken)"
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border-l-[3px] ${
                      isActive
                        ? `${item.colorBg} ${item.colorActive} ${item.colorBorder}`
                        : "text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken) border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.color}`} />
                      <svg
                        className={`w-[18px] h-[18px] transition-colors ${isActive ? item.colorActive : "text-(--color-text-tertiary) group-hover:text-(--color-text-secondary)"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        {item.icon}
                      </svg>
                      <span>{item.label}</span>
                      {item.soon && (
                        <span className={`ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${isActive ? `${item.colorBg} ${item.colorActive}` : "bg-(--color-surface-sunken) text-(--color-text-tertiary)"}`}>
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Admin nav — visible to admin/manager (takes flex-1 for admin-only sidebar) */}
      {isManagerOrAdmin && (
        <nav className={`px-3 ${isAdmin ? "flex-1" : "mt-2 mb-4"}`}>
          <p className="px-3 mb-2 text-[10px] font-bold text-violet-500/70 dark:text-violet-400/70 uppercase tracking-[0.15em]">
            Admin
          </p>
          <div className="space-y-0.5">
            {adminNav
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border-l-[3px] ${
                      isActive
                        ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500"
                        : "text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken) border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-violet-500" />
                      <svg
                        className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-violet-600 dark:text-violet-400" : "text-(--color-text-tertiary) group-hover:text-(--color-text-secondary)"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        {item.icon}
                      </svg>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
          </div>
        </nav>
      )}

      {/* User menu trigger */}
      <div className="px-3 pb-4 relative" ref={menuRef}>
        {/* Popover menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-(--color-surface-raised) border border-(--color-border) rounded-xl overflow-hidden animate-fade-up"
            style={{ animationDuration: "0.15s", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="p-1.5">
              {!isAdmin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setMobileOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken) transition-all duration-150 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Profile
                </button>
              )}

              <button
                onClick={toggle}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-surface-sunken) transition-all duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4 text-(--color-text-tertiary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  {theme === "light" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                  )}
                </svg>
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
            </div>

            <div className="border-t border-(--color-border)">
              <div className="p-1.5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-red-500 hover:bg-red-50 transition-all duration-150 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl hover:bg-(--color-surface-sunken) transition-all duration-200 cursor-pointer"
        >
          {/* Avatar */}
          {profileData.avatar_url ? (
            <img
              src={profileData.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-(--color-border)"
            />
          ) : (
            <div className="w-9 h-9 rounded-full accent-gradient flex items-center justify-center text-[12px] font-bold text-white shrink-0 shadow-sm">
              {displayName
                ? displayName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "?"}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold text-(--color-text) truncate leading-tight">
              {displayName || "Account"}
            </p>
            {userEmail && (
              <p className="text-[11px] text-(--color-text-tertiary) truncate leading-tight mt-0.5">
                {userEmail}
              </p>
            )}
          </div>
          {/* Chevron */}
          <svg
            className={`w-3.5 h-3.5 text-(--color-text-tertiary) transition-transform duration-200 shrink-0 ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen surface-grid ${routeColorClass}`}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[260px] border-r border-(--color-border) transition-transform duration-300 ease-out lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ boxShadow: "var(--shadow-lg)", background: "linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-(--color-surface-raised)/80 backdrop-blur-xl border-b border-(--color-border)">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-(--color-surface-sunken) text-(--color-text-secondary) cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-display font-bold text-sm text-(--color-text)">
              AI Apply Agents
            </span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <main className="lg:ml-[260px]">
        {/* Header bar with breadcrumb */}
        <header className="sticky top-0 z-20 hidden lg:block border-b border-(--color-border) backdrop-blur-xl" style={{ background: "linear-gradient(90deg, var(--color-surface-raised), rgba(108, 92, 231, 0.03), var(--color-surface-raised))" }}>
          <div className="max-w-5xl mx-auto px-6 h-12 flex items-center">
            <Breadcrumb />
          </div>
        </header>

        {/* Content area with top gradient wash */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-64 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(108, 92, 231, 0.04), transparent)" }} />
          <div className="relative max-w-5xl mx-auto px-6 py-8 lg:py-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
