import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/noto-sans-thai";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/500.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA removed: no service worker, no install prompt. On this and every
// future load we actively unregister any leftover SW + wipe its caches,
// so stale bundles can never be served from the SW again.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    });
    if (window.caches) {
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k))).catch(() => {})
      );
    }
  });
}