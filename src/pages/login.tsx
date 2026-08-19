import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useReducedMotion } from "framer-motion";

export function Login() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();

  const target = window.location.pathname + window.location.search || "/";

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate(target, { replace: true });
  }, [isLoaded, isSignedIn, navigate, target]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const portalUrl = `https://me.mcky.space?from=paper&redirect=${encodeURIComponent(target)}`;
      window.location.replace(portalUrl);
    }
  }, [isLoaded, isSignedIn, target]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">กำลังนำทางไปยังหน้าเข้าสู่ระบบ...</p>
    </div>
  );
}