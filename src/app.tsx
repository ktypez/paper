import { lazy, Suspense } from "react";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { PageLoader } from "@/components/page-loader";
import { ThemeProvider } from "@/lib/theme";

const AuthRoot = lazy(() => import("@/auth-root").then((module) => ({ default: module.AuthRoot })));

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
        <Suspense fallback={<PageLoader />}>
          <AuthRoot publishableKey={publishableKey} />
        </Suspense>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
