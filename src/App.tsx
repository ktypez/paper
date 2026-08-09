import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ThemeProvider } from "@/lib/theme-provider";
import { Layout } from "@/components/layout";

const Dashboard = lazy(() => import("@/pages/dashboard").then(m => ({ default: m.Dashboard })));
const Receipts = lazy(() => import("@/pages/receipts").then(m => ({ default: m.Receipts })));
const ReceiptDetail = lazy(() => import("@/pages/receipt-detail").then(m => ({ default: m.ReceiptDetail })));
const Upload = lazy(() => import("@/pages/upload").then(m => ({ default: m.Upload })));
const Categories = lazy(() => import("@/pages/categories").then(m => ({ default: m.Categories })));
const Settings = lazy(() => import("@/pages/settings").then(m => ({ default: m.Settings })));
const Login = lazy(() => import("@/pages/login").then(m => ({ default: m.Login })));

function PageLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="receipts/:id" element={<ReceiptDetail />} />
          <Route path="upload" element={<Upload />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
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
      <ClerkProvider publishableKey={publishableKey}>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </ClerkProvider>
    </ThemeProvider>
  );
}