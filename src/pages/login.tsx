import { type CSSProperties, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";
import { ArchiveStack } from "@/components/archive-stack";

const darkMQ = () => window.matchMedia("(prefers-color-scheme: dark)");

function subscribeSystemTheme(onChange: () => void) {
  const m = darkMQ();
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}

/* shadcn token values scoped to the login screen, driven by the SYSTEM
   preference — so the sign-in page always matches the OS, regardless of the
   app's in-app theme toggle. */
const LIGHT_VARS: CSSProperties = {
  "--background": "#f7f7f6",
  "--foreground": "#16181d",
  "--card": "#ffffff",
  "--card-foreground": "#16181d",
  "--primary": "#1d4ed8",
  "--primary-foreground": "#ffffff",
  "--muted": "#eceef1",
  "--muted-foreground": "#4b515c",
  "--border": "rgba(22, 24, 29, 0.1)",
} as CSSProperties;

const DARK_VARS: CSSProperties = {
  "--background": "#17181c",
  "--foreground": "#eceef2",
  "--card": "#1e2025",
  "--card-foreground": "#eceef2",
  "--primary": "#6b93d8",
  "--primary-foreground": "#0c1220",
  "--muted": "#212329",
  "--muted-foreground": "#a8aeb8",
  "--border": "rgba(236, 238, 242, 0.12)",
} as CSSProperties;

export function Login() {
  const reduce = useReducedMotion();
  // Where the user was heading — come back here after signing in.
  const redirect = window.location.pathname + window.location.search || "/";
  const dark = useSyncExternalStore(
    subscribeSystemTheme,
    () => darkMQ().matches,
    () => false,
  );
  const themeVars = dark ? DARK_VARS : LIGHT_VARS;

  return (
    <div
      className="flex min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        ...themeVars,
      }}
    >
      {/* Brand panel */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="hidden w-1/2 flex-col justify-between border-r border-border bg-card p-10 lg:flex"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
            <FileText className="h-4 w-4 text-primary" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            Paper
          </span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="font-display text-4xl leading-tight tracking-tight text-foreground">
              ที่เก็บเอกสาร
              <br />
              ส่วนตัวของคุณ
            </p>
            <p className="max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
              จัดระเบียบใบเสร็จและเอกสารสำคัญทั้งหมดไว้ในที่เดียว
              ค้นหาเมื่อไหร่ก็เจอเมื่อนั้น
            </p>
          </div>

          {/* Abstract archive stack motif */}
          <ArchiveStack />
        </div>

        <p className="text-xs text-muted-foreground">paper.mcky.space</p>
      </motion.div>

      {/* Sign-in side */}
      <div className="flex flex-1 items-center justify-center p-4">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
              <FileText className="h-4 w-4 text-primary" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">
              Paper
            </span>
          </div>

          <SignIn
            routing="hash"
            oauthFlow="redirect"
            afterSignInUrl={redirect}
            afterSignUpUrl={redirect}
            fallbackRedirectUrl={redirect}
            appearance={{
              variables: {
                colorBackground: dark ? "#1e2025" : "#ffffff",
                colorPrimary: dark ? "#6b93d8" : "#1d4ed8",
                colorText: dark ? "#eceef2" : "#16181d",
                colorTextSecondary: dark ? "#a8aeb8" : "#4b515c",
                colorInputBackground: dark ? "#17181c" : "#ffffff",
                colorInputText: dark ? "#eceef2" : "#16181d",
                colorNeutral: dark ? "#eceef2" : "#16181d",
                colorTextOnPrimaryBackground: dark ? "#0c1220" : "#ffffff",
              },
              elements: {
                rootBox: { width: "100%", maxWidth: "100%", margin: 0 },
                card: {
                  width: "100%",
                  minWidth: 0,
                  boxShadow: "var(--shadow, none)",
                  borderRadius: "0.75rem",
                },
                header: { padding: "1.5rem 1.5rem 0" },
                main: { padding: "1rem 1.5rem" },
                footer: { padding: "0 1.5rem 1.5rem" },
              },
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}