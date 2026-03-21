import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { ThemeProvider } from "./hooks/useTheme";
import { ProfileProvider, useProfile } from "./hooks/useProfile";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Resumes from "./pages/Resumes";

import Onboarding from "./pages/Onboarding";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import MasterProfile from "./pages/MasterProfile";
import AdminOverview from "./pages/admin/AdminOverview";
import UserManagement from "./pages/admin/UserManagement";
import TenantManagement from "./pages/admin/TenantManagement";
import AuditLog from "./pages/admin/AuditLog";
import NotificationsManager from "./pages/admin/NotificationsManager";

const ResumeEditorPage = lazy(() => import("./pages/ResumeEditor"));
const ResumePreviewPageLazy = lazy(() => import("./pages/ResumePreviewPage"));

const LazyFallback = (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
  </div>
);

function ResumeEditorLazy() {
  return (
    <Suspense fallback={LazyFallback}>
      <ResumeEditorPage />
    </Suspense>
  );
}

function ResumePreviewLazy() {
  return (
    <Suspense fallback={LazyFallback}>
      <ResumePreviewPageLazy />
    </Suspense>
  );
}

function ProtectedWithProfile({ children }: { children: React.ReactNode }) {
  return (
    <SessionAuth>
      <ProfileProvider>{children}</ProfileProvider>
    </SessionAuth>
  );
}

/** Redirects to / if the user is not admin or manager. */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-(--color-surface) flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (role !== "admin" && role !== "manager") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Redirects to /onboarding if no profile exists yet. Admins skip onboarding. */
function RequireProfile({ children }: { children: React.ReactNode }) {
  const { loading, exists, role } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-(--color-surface) flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  // Admins don't need onboarding
  if (role === "admin") {
    return <>{children}</>;
  }

  if (!exists) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

/** Redirects admins to /admin since they don't use the member dashboard. */
function RedirectAdminToPanel({ children }: { children: React.ReactNode }) {
  const { role, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-(--color-surface) flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

/** Redirects to / if profile already exists. */
function RequireNoProfile({ children }: { children: React.ReactNode }) {
  const { loading, exists } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-(--color-surface) flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (exists) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/auth/callback/:providerId"
            element={<AuthCallback />}
          />

          {/* Onboarding — only if no profile */}
          <Route
            path="/onboarding"
            element={
              <ProtectedWithProfile>
                <RequireNoProfile>
                  <Onboarding />
                </RequireNoProfile>
              </ProtectedWithProfile>
            }
          />

          {/* App routes — require profile */}
          <Route
            path="/"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <RedirectAdminToPanel>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </RedirectAdminToPanel>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <Profile />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/resumes"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <Resumes />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/resumes/new"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <ResumeEditorLazy />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/resumes/analyze"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <ResumeAnalyzer />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/resumes/:id"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <ResumeEditorLazy />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/resumes/:id/preview"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <ResumePreviewLazy />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/sources"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <ComingSoon title="Job Sources" />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/workflows"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <ComingSoon title="Workflows" />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />

          <Route
            path="/master-profile"
            element={
              <ProtectedWithProfile>
                <RequireProfile>
                  <Layout>
                    <MasterProfile />
                  </Layout>
                </RequireProfile>
              </ProtectedWithProfile>
            }
          />

          {/* Admin routes — no onboarding/profile required */}
          <Route
            path="/admin"
            element={
              <ProtectedWithProfile>
                <RequireAdmin>
                  <Layout>
                    <AdminOverview />
                  </Layout>
                </RequireAdmin>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedWithProfile>
                <RequireAdmin>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </RequireAdmin>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <ProtectedWithProfile>
                <RequireAdmin>
                  <Layout>
                    <TenantManagement />
                  </Layout>
                </RequireAdmin>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedWithProfile>
                <RequireAdmin>
                  <Layout>
                    <AuditLog />
                  </Layout>
                </RequireAdmin>
              </ProtectedWithProfile>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedWithProfile>
                <RequireAdmin>
                  <Layout>
                    <NotificationsManager />
                  </Layout>
                </RequireAdmin>
              </ProtectedWithProfile>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-(--color-text) tracking-tight">
        {title}
      </h1>
      <p className="text-sm text-(--color-text-secondary) mt-1 mb-8">
        This feature is coming soon.
      </p>

      <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-(--color-surface-sunken) to-(--color-surface) border border-(--color-border) flex items-center justify-center mb-4 shadow-sm">
          <svg
            className="w-6 h-6 text-(--color-text-tertiary)"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-(--color-text-secondary) mb-1">
          Under construction
        </p>
        <p className="text-xs text-(--color-text-tertiary)">
          We're building this feature right now.
        </p>
      </div>
    </div>
  );
}

export default App;
