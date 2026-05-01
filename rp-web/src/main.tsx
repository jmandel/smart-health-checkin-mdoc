import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { emit } from "./debug/events.ts";
import "./app/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

emit("BOOT", { userAgent: navigator.userAgent, href: location.href });

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
