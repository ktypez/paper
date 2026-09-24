import { lazy, Suspense, useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useParams } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { thTH } from "@clerk/localizations";
import { AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/page-loader";
import { RecentPage } from "@/pages/recent-page";
import { QueryProvider } from "@/lib/query";

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

function AuthenticatedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <PageLoader />;
  if (!isSignedIn) return <SignInRedirect />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

function OldDocumentRedirect() {
  const { id } = useParams();
  return <Navigate to={`/d/${encodeURIComponent(id ?? "")}`} replace />;
}

const router = createBrowserRouter([
  {
    element: <AuthenticatedLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <RecentPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "search", element: <SearchPage /> },
          { path: "capture", element: <CapturePage /> },
          { path: "more", element: <MorePage /> },
          { path: "more/categories", element: <CategoriesPage /> },
          { path: "more/settings", element: <SettingsPage /> },
          { path: "d/:id", element: <DocumentPage /> },
          { path: "lib", element: <Navigate to="/library" replace /> },
          { path: "r/:id", element: <OldDocumentRedirect /> },
          { path: "receipts", element: <Navigate to="/library" replace /> },
          { path: "receipts/:id", element: <OldDocumentRedirect /> },
          { path: "upload", element: <Navigate to="/capture" replace /> },
          { path: "dashboard", element: <Navigate to="/" replace /> },
          { path: "categories", element: <Navigate to="/more/categories" replace /> },
          { path: "settings", element: <Navigate to="/more/settings" replace /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function AuthRoot({ publishableKey }: { publishableKey: string }) {
  return (
    <ClerkProvider publishableKey={publishableKey} localization={thTH}>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ClerkProvider>
  );
}
