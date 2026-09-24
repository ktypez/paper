import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { thTH } from "@clerk/localizations";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/lib/query";
import { ThemeProvider } from "@/lib/theme";

const RecentPage = lazy(() => import("@/pages/recent-page").then((module) => ({ default: module.RecentPage })));
const LibraryPage = lazy(() => import("@/pages/library-page").then((module) => ({ default: module.LibraryPage })));
const SearchPage = lazy(() => import("@/pages/search-page").then((module) => ({ default: module.SearchPage })));
const CapturePage = lazy(() => import("@/pages/capture-page").then((module) => ({ default: module.CapturePage })));
const MorePage = lazy(() => import("@/pages/more-page").then((module) => ({ default: module.MorePage })));
const CategoriesPage = lazy(() =>
  import("@/pages/categories-page").then((module) => ({ default: module.CategoriesPage })),
);
const SettingsPage = lazy(() => import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })));
const DocumentPage = lazy(() =>
  import("@/pages/document-page").then((module) => ({ default: module.DocumentPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found-page").then((module) => ({ default: module.NotFoundPage })),
);

function PageLoader() {
  return (
    <div className="grid min-h-[55dvh] place-items-center" role="status" aria-label="กำลังเปิด Paper">
      <div className="text-center">
        <div className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full w-1/2 animate-[loading-slide_900ms_ease-in-out_infinite] bg-accent-solid" />
        </div>
        <p className="mt-3 text-sm text-muted">กำลังเปิด Paper…</p>
      </div>
    </div>
  );
}

function SignInRedirect() {
  useEffect(() => {
    const target = new URL("https://me.mcky.space");
    target.searchParams.set("from", "paper");
    target.searchParams.set("redirect", `${window.location.pathname}${window.location.search}`);
    window.location.replace(target.toString());
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-5 text-center text-ink">
      <div>
        <p className="text-lg font-semibold">เข้าสู่ระบบ Paper</p>
        <p className="mt-2 text-sm text-muted">กำลังพาไปยังหน้าเข้าสู่ระบบ…</p>
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <PageLoader />;
  if (!isSignedIn) return <SignInRedirect />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<RecentPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="more/categories" element={<CategoriesPage />} />
          <Route path="more/settings" element={<SettingsPage />} />
          <Route path="d/:id" element={<DocumentPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="lib" element={<Navigate to="/library" replace />} />
          <Route path="r/:id" element={<OldDocumentRedirect />} />
          <Route path="receipts" element={<Navigate to="/library" replace />} />
          <Route path="receipts/:id" element={<OldDocumentRedirect />} />
          <Route path="upload" element={<Navigate to="/capture" replace />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="categories" element={<Navigate to="/more/categories" replace />} />
          <Route path="settings" element={<Navigate to="/more/settings" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function OldDocumentRedirect() {
  const { id } = useParams();
  return <Navigate to={`/d/${encodeURIComponent(id ?? "")}`} replace />;
}

export function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas px-5 text-center text-ink">
        <p className="text-sm text-muted">ไม่พบ VITE_CLERK_PUBLISHABLE_KEY</p>
      </main>
    );
  }

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ClerkProvider publishableKey={publishableKey} localization={thTH}>
          <QueryProvider>
            <BrowserRouter>
              <AuthenticatedRoutes />
            </BrowserRouter>
          </QueryProvider>
        </ClerkProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
