import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { thTH } from "@clerk/localizations";
import { ThemeProvider } from "@/lib/theme-provider";
import { QueryProvider } from "@/lib/query";
import { useOutboxDrain } from "@/lib/outbox";
import { Layout } from "@/components/layout";
import { PaperPlane } from "@/components/paper-plane";

const Home = lazy(() => import("@/pages/home").then((m) => ({ default: m.Home })));
const Library = lazy(() => import("@/pages/library").then((m) => ({ default: m.Library })));
const ReceiptDetail = lazy(() =>
  import("@/pages/receipt-detail").then((m) => ({ default: m.ReceiptDetail }))
);
const Capture = lazy(() => import("@/pages/capture").then((m) => ({ default: m.Capture })));
const Categories = lazy(() =>
  import("@/pages/categories").then((m) => ({ default: m.Categories }))
);
const Settings = lazy(() => import("@/pages/settings").then((m) => ({ default: m.Settings })));
const Login = lazy(() => import("@/pages/login").then((m) => ({ default: m.Login })));

function PageLoader() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background">
      <PaperPlane />
      <p className="text-sm text-muted-foreground">กำลังพับกระดาษ...</p>
    </div>
  );
}

function AppRoutes() {
  useOutboxDrain();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lib" element={<Library />} />
          <Route path="r/:id" element={<ReceiptDetail />} />
          <Route path="capture" element={<Capture />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
          {/* v1 routes → v2 equivalents */}
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="receipts" element={<Navigate to="/lib" replace />} />
          <Route path="receipts/:id" element={<ReceiptToV2 />} />
          <Route path="upload" element={<Navigate to="/capture" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

import { useParams } from "react-router";
function ReceiptToV2() {
  const { id } = useParams();
  return <Navigate to={`/r/${id}`} replace />;
}

function Root() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  return <AppRoutes />;
}

export default function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Missing VITE_CLERK_PUBLISHABLE_KEY — check the build environment.
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={publishableKey} localization={thTH}>
        <QueryProvider>
          <BrowserRouter>
            <Root />
          </BrowserRouter>
        </QueryProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}
