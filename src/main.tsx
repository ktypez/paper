import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/noto-sans-thai";
import { App } from "./app";
import { removeLegacyRuntime } from "./lib/runtime-cleanup";
import "./styles.css";

void removeLegacyRuntime();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
